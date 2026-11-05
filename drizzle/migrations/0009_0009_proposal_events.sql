CREATE TABLE public.proposal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'proposta',
  canal text NOT NULL DEFAULT 'whatsapp',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.proposal_events TO authenticated;
GRANT ALL ON public.proposal_events TO service_role;
ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver propostas próprias ou da equipe" ON public.proposal_events FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Registrar proposta enviada" ON public.proposal_events FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());
CREATE INDEX ON public.proposal_events(owner_id);