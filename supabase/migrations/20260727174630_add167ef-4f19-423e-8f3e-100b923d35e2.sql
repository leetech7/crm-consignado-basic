CREATE TABLE public.age_factors (
  idade INTEGER PRIMARY KEY CHECK (idade >= 0 AND idade < 150),
  fator NUMERIC(12,5) NOT NULL CHECK (fator > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.age_factors TO authenticated;
GRANT ALL ON public.age_factors TO service_role;

ALTER TABLE public.age_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver fatores" ON public.age_factors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin insere fatores" ON public.age_factors
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin atualiza fatores" ON public.age_factors
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin remove fatores" ON public.age_factors
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER age_factors_touch_updated_at
  BEFORE UPDATE ON public.age_factors
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();