
-- 1) Lock down SECURITY DEFINER functions from anon/public
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_manager_or_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin(uuid) TO authenticated, service_role;

-- Trigger-only SECURITY DEFINER functions: no direct execution needed by clients
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_client_paid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_commission_rate_self_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- 2) Explicit INSERT/DELETE policies on commissions restricted to admin/gerente
CREATE POLICY "Gerente/Admin cria comissões"
ON public.commissions
FOR INSERT
TO authenticated
WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Gerente/Admin remove comissões"
ON public.commissions
FOR DELETE
TO authenticated
USING (public.is_manager_or_admin(auth.uid()));
