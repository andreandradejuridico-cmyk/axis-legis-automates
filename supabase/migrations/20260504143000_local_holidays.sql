-- ============ LOCAL HOLIDAYS ============
CREATE TABLE IF NOT EXISTS public.local_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  type TEXT DEFAULT 'municipal', -- 'estadual', 'municipal', 'custom'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.local_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view local holidays" ON public.local_holidays
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage local holidays" ON public.local_holidays
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_local_holidays_updated_at
  BEFORE UPDATE ON public.local_holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
