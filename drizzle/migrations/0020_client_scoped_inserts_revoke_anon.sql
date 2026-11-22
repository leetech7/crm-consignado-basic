DROP POLICY IF EXISTS "Inserir atividades" ON public.activities;
CREATE POLICY "Inserir atividades" ON public.activities FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = activities.client_id AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))));
DROP POLICY IF EXISTS "Inserir leituras" ON public.client_ai_analyses;
CREATE POLICY "Inserir leituras" ON public.client_ai_analyses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_ai_analyses.client_id AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))));
DROP POLICY IF EXISTS "Registrar proposta enviada" ON public.proposal_events;
CREATE POLICY "Registrar proposta enviada" ON public.proposal_events FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid() AND (client_id IS NULL OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = proposal_events.client_id AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid())))));
REVOKE ALL ON public.activities, public.age_factors, public.client_ai_analyses, public.client_attachments, public.client_contracts, public.clients, public.commissions, public.comunicados, public.profiles, public.proposal_events, public.user_roles, public.team_reference_access FROM anon;