-- ============ ADD CUSTOM API KEYS TO AI CONFIG ============
ALTER TABLE public.ai_agent_config
  ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
  ADD COLUMN IF NOT EXISTS gemini_api_key TEXT,
  ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT,
  ADD COLUMN IF NOT EXISTS lovable_api_key TEXT;
