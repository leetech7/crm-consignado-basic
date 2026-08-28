CREATE TABLE public.comunicados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  conteudo text NOT NULL DEFAULT '',
  data_comunicado date NOT NULL DEFAULT CURRENT_DATE,
  prioridade text NOT NULL DEFAULT 'normal',
  author_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comunicados TO authenticated;
GRANT ALL ON public.comunicados TO service_role;

ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem comunicados" ON public.comunicados
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gerente/Admin cria comunicados" ON public.comunicados
  FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()) AND auth.uid() = author_id);

CREATE POLICY "Gerente/Admin edita comunicados" ON public.comunicados
  FOR UPDATE TO authenticated USING (public.is_manager_or_admin(auth.uid())) WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Gerente/Admin remove comunicados" ON public.comunicados
  FOR DELETE TO authenticated USING (public.is_manager_or_admin(auth.uid()));

CREATE TRIGGER trg_comunicados_updated BEFORE UPDATE ON public.comunicados
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();