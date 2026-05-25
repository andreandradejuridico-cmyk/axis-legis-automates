-- ============ 1. CLEANUP CONFIG POLICIES FOR ANON ============
DROP POLICY IF EXISTS "Anyone can read enabled config" ON public.ai_agent_config;
DROP POLICY IF EXISTS "Public can read safe agent config fields" ON public.ai_agent_config;

-- ============ 2. CREATE STAFF ONLY SELECT POLICY ============
CREATE POLICY "Staff can select agent config" ON public.ai_agent_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role));

-- ============ 3. CREATE SECURE PUBLIC VIEW ============
-- This view acts as security definer (runs with owner privileges) and only exposes safe columns
CREATE OR REPLACE VIEW public.ai_agent_public_config AS
SELECT id, welcome_message, agent_name, initial_options, enabled
FROM public.ai_agent_config
WHERE enabled = true;

-- ============ 4. GRANT SELECT TO PUBLIC ON VIEW ============
GRANT SELECT ON public.ai_agent_public_config TO anon, authenticated;
