ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS banco_recebimento text,
  ADD COLUMN IF NOT EXISTS agencia_recebimento text,
  ADD COLUMN IF NOT EXISTS conta_recebimento text;