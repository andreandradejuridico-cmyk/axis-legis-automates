-- ============ 1. UNDO LOVABLE CHANGES ============
-- Drop view created by Lovable
DROP VIEW IF EXISTS public.ai_agent_public_config;

-- Drop Lovable's restrictive/broken policies
DROP POLICY IF EXISTS "Public can read safe agent config fields" ON public.ai_agent_config;
DROP POLICY IF EXISTS "Admins manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins view business hours" ON public.business_hours;
DROP POLICY IF EXISTS "Admins manage business hours" ON public.business_hours;
DROP POLICY IF EXISTS "permit_read_conv" ON public.chat_conversations;
DROP POLICY IF EXISTS "permit_read_msg" ON public.chat_messages;

-- ============ 2. RESTORE APPOINTMENTS RLS POLICIES ============
DROP POLICY IF EXISTS "Admins and users can view all appointments" ON public.appointments;
CREATE POLICY "Admins and users can view all appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role));

DROP POLICY IF EXISTS "Admins and users can manage appointments" ON public.appointments;
CREATE POLICY "Admins and users can manage appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role));

-- ============ 3. RESTORE CHAT CONVERSATIONS RLS POLICIES ============
DROP POLICY IF EXISTS "All authenticated users can view conversations" ON public.chat_conversations;
CREATE POLICY "All authenticated users can view conversations" ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage conversations" ON public.chat_conversations;
CREATE POLICY "Admins can manage conversations" ON public.chat_conversations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============ 4. RESTORE CHAT MESSAGES RLS POLICIES ============
DROP POLICY IF EXISTS "All authenticated users can view messages" ON public.chat_messages;
CREATE POLICY "All authenticated users can view messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage messages" ON public.chat_messages;
CREATE POLICY "Admins can manage messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============ 5. RESTORE BUSINESS HOURS RLS POLICIES ============
DROP POLICY IF EXISTS "Staff can view business hours" ON public.business_hours;
CREATE POLICY "Staff can view business hours" ON public.business_hours
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'user'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage business hours" ON public.business_hours;
CREATE POLICY "Admins can manage business hours" ON public.business_hours
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============ 6. RESTORE COLUMN-LEVEL SECURITY FOR AI AGENT CONFIG ============
-- Revoke general SELECT on the table from public and anon roles
REVOKE SELECT ON public.ai_agent_config FROM anon, authenticated;

-- Grant column-level SELECT on non-sensitive columns only to anon role
GRANT SELECT (id, agent_name, welcome_message, enabled, initial_options, created_at, updated_at) ON public.ai_agent_config TO anon;

-- Grant full SELECT on all columns to authenticated users (staff/admins)
GRANT SELECT ON public.ai_agent_config TO authenticated;

-- ============ 7. FUNCTION EXECUTION SECURITY HARDENING ============
-- Revoke execute on SECURITY DEFINER functions from general public/anon roles
REVOKE EXECUTE ON FUNCTION public.on_auth_user_created() FROM public, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
