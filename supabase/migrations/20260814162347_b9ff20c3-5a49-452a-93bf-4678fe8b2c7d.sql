ALTER TABLE public.clients ADD COLUMN compra_divida NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.clients.compra_divida IS 'Valor de compra de dívida do cliente';

-- Garante que usuários autenticados e service_role mantenham acesso à nova coluna
GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;