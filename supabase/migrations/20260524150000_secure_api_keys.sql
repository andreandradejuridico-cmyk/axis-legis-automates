-- Create a table for private API keys, matching the ai_agent_config structure
CREATE TABLE IF NOT EXISTS public.ai_agent_keys (
  id UUID PRIMARY KEY REFERENCES public.ai_agent_config(id) ON DELETE CASCADE,
  openai_api_key TEXT,
  gemini_api_key TEXT,
  openrouter_api_key TEXT,
  lovable_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agent_keys ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage keys" ON public.ai_agent_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Migrate existing keys if they exist in ai_agent_config
INSERT INTO public.ai_agent_keys (id, openai_api_key, gemini_api_key, openrouter_api_key, lovable_api_key)
SELECT id, openai_api_key, gemini_api_key, openrouter_api_key, lovable_api_key
FROM public.ai_agent_config
ON CONFLICT (id) DO UPDATE SET
  openai_api_key = EXCLUDED.openai_api_key,
  gemini_api_key = EXCLUDED.gemini_api_key,
  openrouter_api_key = EXCLUDED.openrouter_api_key,
  lovable_api_key = EXCLUDED.lovable_api_key;

-- Now drop the columns from the public configuration table
ALTER TABLE public.ai_agent_config
  DROP COLUMN IF EXISTS openai_api_key,
  DROP COLUMN IF EXISTS gemini_api_key,
  DROP COLUMN IF EXISTS openrouter_api_key,
  DROP COLUMN IF EXISTS lovable_api_key;

-- Grants for the table
GRANT ALL ON public.ai_agent_keys TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agent_keys TO authenticated;
