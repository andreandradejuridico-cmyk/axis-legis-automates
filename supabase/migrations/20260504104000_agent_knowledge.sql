-- ============ AGENT KNOWLEDGE ============
CREATE TABLE public.agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active knowledge" ON public.agent_knowledge
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Admins can manage knowledge" ON public.agent_knowledge
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_agent_knowledge_updated_at
  BEFORE UPDATE ON public.agent_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add some initial knowledge
INSERT INTO public.agent_knowledge (title, content, category) VALUES
('Sobre a Axis Legis', 'A Axis Legis é uma boutique jurídica especializada em tecnologia e inovação para o setor jurídico. Oferecemos soluções personalizadas para escritórios de advocacia e departamentos jurídicos.', 'Institucional'),
('Serviços', 'Nossos serviços incluem: Automação de Processos, Implementação de IA Jurídica, Consultoria em Legal Operations e Gestão de Dados Jurídicos.', 'Serviços'),
('Agendamento', 'As demonstrações podem ser agendadas diretamente através deste chat. O sistema verificará os horários disponíveis e confirmará sua reserva.', 'Suporte');
