-- 1. Garante que as funções e esquemas básicos estejam acessíveis
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- 2. Permissões específicas para o Widget de Chat (visitantes anônimos)
-- Eles precisam conseguir ler a config da IA e inserir mensagens
GRANT SELECT ON public.ai_agent_config TO anon;
GRANT INSERT, SELECT ON public.chat_conversations TO anon;
GRANT INSERT, SELECT ON public.chat_messages TO anon;

-- 3. Garante que as permissões de execução das funções de Admin estejam OK
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;
