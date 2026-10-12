CREATE POLICY "Mover arquivos pendentes para o cliente"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'client-attachments'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE (c.id::text = (storage.foldername(name))[1])
      AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))
  )
);