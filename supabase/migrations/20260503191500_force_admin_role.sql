-- Corrige inconsistências de permissões onde o dono do projeto ficou sem a role 'admin'
-- e garante que todos os atendentes possam ler as conversas.

-- 1. Garante que o usuário mais antigo (geralmente o dono) seja SEMPRE um admin
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Se não tem role nenhuma, insere como admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = first_user_id) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (first_user_id, 'admin');
    ELSE
      -- Se tem role, força a ser admin
      UPDATE public.user_roles SET role = 'admin' WHERE user_id = first_user_id;
    END IF;
  END IF;
END;
$$;

-- 2. Simplifica as políticas de leitura para que QUALQUER usuário autenticado (staff) 
-- veja as conversas, evitando bugs de usuários sem role definida.
DROP POLICY IF EXISTS "Admins and users can view all conversations" ON public.chat_conversations;
CREATE POLICY "All authenticated users can view conversations" ON public.chat_conversations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and users can view all messages" ON public.chat_messages;
CREATE POLICY "All authenticated users can view messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (true);
