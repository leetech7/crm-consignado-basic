CREATE POLICY "Atualizar arquivos de clientes acessíveis"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-attachments'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))
  )
)
WITH CHECK (
  bucket_id = 'client-attachments'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))
  )
);