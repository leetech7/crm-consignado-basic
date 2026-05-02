-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'vendedor');
CREATE TYPE public.pipeline_stage AS ENUM ('novo', 'quente', 'frio', 'descartado', 'em_negociacao', 'digitado', 'aguardando_link', 'pago');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','gerente'));
$$;

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  idade INTEGER,
  telefone TEXT,
  orgao TEXT,
  endereco TEXT,
  observacoes TEXT,
  proximo_contato TIMESTAMPTZ,
  taxa_rps NUMERIC(12,2) DEFAULT 0,
  stage pipeline_stage NOT NULL DEFAULT 'novo',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_clients_owner ON public.clients(owner_id);
CREATE INDEX idx_clients_stage ON public.clients(stage);
CREATE INDEX idx_clients_proximo ON public.clients(proximo_contato);

-- Activities
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_activities_client ON public.activities(client_id);

-- Commissions
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taxa_rps NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  paga BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_commissions_vendedor ON public.commissions(vendedor_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);

  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendedor');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate commission when stage = 'pago'
CREATE OR REPLACE FUNCTION public.handle_client_paid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rate NUMERIC(5,2);
BEGIN
  IF NEW.stage = 'pago' AND (OLD.stage IS NULL OR OLD.stage <> 'pago') THEN
    NEW.paid_at = now();
    SELECT commission_rate INTO rate FROM public.profiles WHERE id = NEW.owner_id;
    rate := COALESCE(rate, 0);
    INSERT INTO public.commissions (client_id, vendedor_id, taxa_rps, percentual, valor)
    VALUES (NEW.id, NEW.owner_id, COALESCE(NEW.taxa_rps,0), rate, ROUND(COALESCE(NEW.taxa_rps,0) * rate / 100, 2));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_client_paid BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_client_paid();

-- RLS Policies: profiles
CREATE POLICY "Próprio perfil ou gerente" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Atualizar próprio perfil" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- RLS: user_roles
CREATE POLICY "Ver próprias roles ou admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: clients
CREATE POLICY "Ver clientes próprios ou gerente" ON public.clients FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Inserir clientes" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Atualizar próprios clientes" ON public.clients FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Deletar próprios clientes" ON public.clients FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));

-- RLS: activities
CREATE POLICY "Ver atividades de clientes acessíveis" ON public.activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))));
CREATE POLICY "Inserir atividades" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Deletar próprias atividades" ON public.activities FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_manager_or_admin(auth.uid()));

-- RLS: commissions
CREATE POLICY "Ver próprias comissões ou gerente" ON public.commissions FOR SELECT TO authenticated
  USING (auth.uid() = vendedor_id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Gerente atualiza comissões" ON public.commissions FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin(auth.uid()));