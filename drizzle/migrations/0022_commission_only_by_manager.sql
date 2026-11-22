CREATE OR REPLACE FUNCTION public.handle_client_paid()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE rate NUMERIC(5,2); base NUMERIC(12,2);
BEGIN
  IF NEW.stage = 'pago' AND (OLD.stage IS NULL OR OLD.stage <> 'pago') THEN
    NEW.paid_at = now();
    IF public.is_manager_or_admin(auth.uid()) THEN
      SELECT commission_rate INTO rate FROM public.profiles WHERE id = NEW.owner_id;
      rate := COALESCE(rate, 0);
      base := COALESCE(NEW.valor_rps_total, 0);
      IF base = 0 THEN base := COALESCE(NEW.taxa_rps, 0); END IF;
      INSERT INTO public.commissions (client_id, vendedor_id, taxa_rps, percentual, valor)
      VALUES (NEW.id, NEW.owner_id, base, rate, ROUND(base * rate / 100, 2));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;