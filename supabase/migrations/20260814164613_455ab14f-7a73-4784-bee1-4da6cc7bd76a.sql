DROP POLICY IF EXISTS "Atualizar próprio perfil" ON public.profiles;
CREATE POLICY "Atualizar próprio perfil"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((auth.uid() = id) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() = id) OR public.has_role(auth.uid(), 'admin'::app_role));