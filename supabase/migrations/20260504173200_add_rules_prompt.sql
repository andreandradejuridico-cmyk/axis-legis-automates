ALTER TABLE ai_agent_config ADD COLUMN rules_prompt TEXT;
COMMENT ON COLUMN ai_agent_config.rules_prompt IS 'Strict rules that the AI must follow, appended to the system prompt.';
