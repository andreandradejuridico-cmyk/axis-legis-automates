
-- 1. Restrict ai_agent_config: drop public read, expose only safe fields via a view
DROP POLICY IF EXISTS "Anyone can read enabled config" ON public.ai_agent_config;

CREATE OR REPLACE VIEW public.ai_agent_public_config
WITH (security_invoker = true) AS
SELECT id, welcome_message, agent_name, initial_options, enabled
FROM public.ai_agent_config
WHERE enabled = true;

GRANT SELECT ON public.ai_agent_public_config TO anon, authenticated;

-- Allow anon/authenticated to SELECT only the safe columns directly via column privileges
-- (view uses security_invoker so the underlying table still needs SELECT; add a narrow policy)
CREATE POLICY "Public can read safe agent config fields"
ON public.ai_agent_config
FOR SELECT
TO anon, authenticated
USING (enabled = true);

-- Note: column-level privileges restrict what the view can actually expose to anon
REVOKE SELECT ON public.ai_agent_config FROM anon, authenticated;
GRANT SELECT (id, welcome_message, agent_name, initial_options, enabled)
  ON public.ai_agent_config TO anon, authenticated;

-- 2. appointments: replace overly permissive policy with admin-only
DROP POLICY IF EXISTS "staff_manage_agenda" ON public.appointments;

CREATE POLICY "Admins manage appointments"
ON public.appointments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. business_hours: restrict read to admins (edge functions use service role and bypass RLS)
DROP POLICY IF EXISTS "staff_view_hours" ON public.business_hours;

CREATE POLICY "Admins view business hours"
ON public.business_hours
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage business hours"
ON public.business_hours
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Remove permissive read on chat_conversations and chat_messages
DROP POLICY IF EXISTS "permit_read_conv" ON public.chat_conversations;
DROP POLICY IF EXISTS "permit_read_msg" ON public.chat_messages;

-- 5. SECURITY DEFINER linter: revoke EXECUTE from anon (functions self-check admin role)
REVOKE EXECUTE ON FUNCTION public.get_all_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;
