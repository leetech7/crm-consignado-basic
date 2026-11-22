CREATE TABLE public.team_reference_access (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.team_reference_access TO authenticated;
GRANT ALL ON public.team_reference_access TO service_role;
ALTER TABLE public.team_reference_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own reference approval or admin" ON public.team_reference_access
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Admin grants reference approval" ON public.team_reference_access
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Admin revokes reference approval" ON public.team_reference_access
  FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
INSERT INTO public.team_reference_access (user_id)
  SELECT DISTINCT r.user_id FROM public.user_roles r
  JOIN public.profiles p ON p.id = r.user_id;
COMMENT ON TABLE public.team_reference_access IS 'Administrator-managed read approvals for announcements and age factors only. Existing team accounts were grandfathered at creation; future signups receive no automatic approval.';
ALTER POLICY "Autenticados veem comunicados" ON public.comunicados
  USING (public.is_manager_or_admin((SELECT auth.uid())) OR EXISTS (
    SELECT 1 FROM public.team_reference_access a WHERE a.user_id = (SELECT auth.uid())
  ));
ALTER POLICY "Autenticados podem ver fatores" ON public.age_factors
  USING (public.is_manager_or_admin((SELECT auth.uid())) OR EXISTS (
    SELECT 1 FROM public.team_reference_access a WHERE a.user_id = (SELECT auth.uid())
  ));