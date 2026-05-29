ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS favorito boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_clients_favorito ON public.clients(favorito) WHERE favorito = true;