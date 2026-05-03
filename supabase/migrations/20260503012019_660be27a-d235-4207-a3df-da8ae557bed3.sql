-- Attachments table
CREATE TABLE public.client_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  categoria TEXT NOT NULL DEFAULT 'outro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_attachments_client ON public.client_attachments(client_id);

ALTER TABLE public.client_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver anexos de clientes acessíveis"
ON public.client_attachments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))));

CREATE POLICY "Inserir anexos em clientes acessíveis"
ON public.client_attachments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid())))
);

CREATE POLICY "Deletar anexos próprios ou gerente"
ON public.client_attachments FOR DELETE TO authenticated
USING (auth.uid() = uploaded_by OR public.is_manager_or_admin(auth.uid()));

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('client-attachments', 'client-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: path layout = {client_id}/{uuid}-{filename}
CREATE POLICY "Ver arquivos de clientes acessíveis"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'client-attachments'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))
  )
);

CREATE POLICY "Enviar arquivos para clientes acessíveis"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-attachments'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))
  )
);

CREATE POLICY "Excluir arquivos de clientes acessíveis"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'client-attachments'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.owner_id = auth.uid() OR public.is_manager_or_admin(auth.uid()))
  )
);