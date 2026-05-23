-- ============ ADD LUNCH BREAK TO BUSINESS HOURS ============
ALTER TABLE public.business_hours
  ADD COLUMN IF NOT EXISTS lunch_start TIME DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS lunch_end TIME DEFAULT '13:00';
