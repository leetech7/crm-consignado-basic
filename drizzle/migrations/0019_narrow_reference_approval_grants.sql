REVOKE ALL ON public.team_reference_access FROM PUBLIC, anon;
REVOKE ALL ON public.team_reference_access FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.team_reference_access TO authenticated;
GRANT ALL ON public.team_reference_access TO service_role;