-- ============ 1. APPOINTMENTS RLS HARDENING ============
DROP POLICY IF EXISTS "Admins and users can view all appointments" ON public.appointments;
CREATE POLICY "Admins and users can view all appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role));

DROP POLICY IF EXISTS "Admins and users can manage appointments" ON public.appointments;
CREATE POLICY "Admins and users can manage appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role));

-- ============ 2. CHAT CONVERSATIONS RLS HARDENING ============
DROP POLICY IF EXISTS "All authenticated users can view conversations" ON public.chat_conversations;
CREATE POLICY "All authenticated users can view conversations" ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role));

-- ============ 3. CHAT MESSAGES RLS HARDENING ============
DROP POLICY IF EXISTS "All authenticated users can view messages" ON public.chat_messages;
CREATE POLICY "All authenticated users can view messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role));

-- ============ 4. BUSINESS HOURS RLS HARDENING ============
DROP POLICY IF EXISTS "Anyone can view business hours" ON public.business_hours;
CREATE POLICY "Staff can view business hours" ON public.business_hours
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role));

-- ============ 5. COLUMN-LEVEL SECURITY FOR AI AGENT CONFIG ============
-- Revoke general SELECT on the table from public and anon roles
REVOKE SELECT ON public.ai_agent_config FROM anon, authenticated;

-- Grant column-level SELECT on non-sensitive columns only to anon role
GRANT SELECT (id, agent_name, welcome_message, enabled, initial_options, created_at, updated_at) ON public.ai_agent_config TO anon;

-- Grant full SELECT on all columns to authenticated users (staff/admins)
GRANT SELECT ON public.ai_agent_config TO authenticated;

-- ============ 6. FUNCTION EXECUTION SECURITY HARDENING ============
-- Revoke execute on SECURITY DEFINER functions from general public/anon roles
REVOKE EXECUTE ON FUNCTION public.on_auth_user_created() FROM public, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
