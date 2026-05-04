-- Adiciona campos para integração com Evolution API
ALTER TABLE public.whatsapp_settings 
ADD COLUMN IF NOT EXISTS api_url TEXT,
ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Garante que a role do administrador tenha permissão de ler e escrever
GRANT ALL ON public.whatsapp_settings TO authenticated;
