-- Storage: uploads pendentes de cliente novo (caminho pending/{user_id}/...)
-- Políticas aditivas; nenhuma coluna ou dado é alterado.
CREATE POLICY "Enviar arquivos pendentes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Ver arquivos pendentes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'client-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Atualizar arquivos pendentes"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'client-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Excluir arquivos pendentes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'client-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
);