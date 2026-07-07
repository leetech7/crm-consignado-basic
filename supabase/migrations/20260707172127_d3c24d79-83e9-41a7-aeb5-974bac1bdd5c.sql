CREATE OR REPLACE FUNCTION public.prevent_commission_rate_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.commission_rate IS DISTINCT FROM OLD.commission_rate THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar a taxa de comissão';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_commission_rate_self_update_trg ON public.profiles;
CREATE TRIGGER prevent_commission_rate_self_update_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_commission_rate_self_update();