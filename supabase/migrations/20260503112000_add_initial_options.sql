-- Adiciona campo de botões iniciais na configuração do agente
ALTER TABLE ai_agent_config ADD COLUMN IF NOT EXISTS initial_options text[] DEFAULT '{Escritório de Advocacia, 3º Setor, Advogado Particular}';

-- Comentário para documentação
COMMENT ON COLUMN ai_agent_config.initial_options IS 'Lista de botões de resposta rápida exibidos no início da conversa';
