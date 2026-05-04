-- Campos para controle de lembretes enviados
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT false;
