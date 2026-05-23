-- ============ AI TOKEN USAGE LOGS ============
CREATE TABLE public.ai_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  cost_estimate NUMERIC(10, 6) NOT NULL DEFAULT 0.0,
  channel TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Admins can view token usage logs
CREATE POLICY "Admins can view token usage logs" ON public.ai_token_usage
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role / Edge functions can manage token usage logs
CREATE POLICY "Service role can insert token usage logs" ON public.ai_token_usage
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
