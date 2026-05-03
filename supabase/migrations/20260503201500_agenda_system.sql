-- ============ BUSINESS HOURS ============
CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday...
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (day_of_week)
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business hours" ON public.business_hours
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage business hours" ON public.business_hours
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Initial Data (Mon-Fri, 09:00 - 18:00)
INSERT INTO public.business_hours (day_of_week, start_time, end_time) VALUES
(1, '09:00', '18:00'),
(2, '09:00', '18:00'),
(3, '09:00', '18:00'),
(4, '09:00', '18:00'),
(5, '09:00', '18:00');

-- ============ APPOINTMENTS ============
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  legal_area TEXT NOT NULL,
  subject TEXT NOT NULL,
  notes TEXT,
  appointment_time TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and users can view all appointments" ON public.appointments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and users can manage appointments" ON public.appointments
  FOR ALL TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX idx_appointments_time ON public.appointments(appointment_time);
CREATE INDEX idx_appointments_status ON public.appointments(status);
