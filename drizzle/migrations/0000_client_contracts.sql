CREATE TABLE public.client_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  banco text,
  numero_contrato text,
  valor_parcela numeric DEFAULT 0,
  prazo_total integer,
  parcelas_pagas integer,
  parcelas_restantes integer,
  saldo_devedor numeric,
  data_inicio date,
  origem text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contracts TO authenticated;
GRANT ALL ON public.client_contracts TO service_role;
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver contratos de clientes acessíveis" ON public.client_contracts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))));
CREATE POLICY "Inserir contratos em clientes acessíveis" ON public.client_contracts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))));
CREATE POLICY "Editar contratos de clientes acessíveis" ON public.client_contracts FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))));
CREATE POLICY "Remover contratos de clientes acessíveis" ON public.client_contracts FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))));
CREATE INDEX ON public.client_contracts(client_id);