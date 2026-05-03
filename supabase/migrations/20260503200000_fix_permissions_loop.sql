-- 1. Garante que usuários autenticados possam executar a função de checagem de roles
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

-- 2. Corrige a política recursiva da tabela user_roles
-- Antigamente ela tentava checar 'has_role' para permitir o 'select', gerando um loop.
-- Agora: Qualquer um logado pode ver SEUS PRÓPRIOS papéis, e admins podem ver todos.
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. Garante acesso de leitura básico para a tabela de configurações da IA (precisa para o widget)
GRANT SELECT ON public.ai_agent_config TO anon, authenticated;

-- 4. Garante acesso de leitura para as configurações de WhatsApp para admins
GRANT SELECT ON public.whatsapp_settings TO authenticated;
