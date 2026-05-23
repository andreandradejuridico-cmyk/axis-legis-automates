import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const FooterCTA = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: form.name,
      email: form.email,
      message: form.message || null,
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível enviar. Tente novamente.");
      return;
    }
    toast.success("Mensagem enviada com sucesso. Entraremos em contato em breve.");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <section id="contato" className="py-24 md:py-32 bg-navy-gradient text-primary-foreground">
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-bronze-light font-sans text-sm tracking-[0.2em] uppercase mb-4">Contato</p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold">
            Pronto Para Automatizar com Segurança?
          </h2>
          <p className="mt-4 text-primary-foreground/50 max-w-lg mx-auto">
            Agende uma demonstração privada e descubra quantas horas faturáveis seu escritório está desperdiçando.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="max-w-md mx-auto space-y-5"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          <Input
            placeholder="Seu nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="bg-primary-foreground/5 border-bronze/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-bronze/50"
          />
          <Input
            type="email"
            placeholder="Seu e-mail profissional"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="bg-primary-foreground/5 border-bronze/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-bronze/50"
          />
          <Textarea
            placeholder="Conte-nos brevemente sobre seu escritório..."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={4}
            className="bg-primary-foreground/5 border-bronze/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-bronze/50 resize-none"
          />

          <div className="flex items-start gap-2.5 py-1 text-left">
            <input
              type="checkbox"
              id="privacy-consent"
              required
              className="mt-1 accent-bronze cursor-pointer"
            />
            <label htmlFor="privacy-consent" className="text-[11px] text-primary-foreground/50 leading-relaxed cursor-pointer select-none">
              Autorizo o processamento dos meus dados profissionais para fins de contato e demonstração, em conformidade com a LGPD e a Política de Privacidade.
            </label>
          </div>

          <Button variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Solicitar Demonstração"}
          </Button>
        </motion.form>

        <div className="mt-20 pt-10 border-t border-white/10 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-1">
                <span className="text-lg font-sans font-bold text-bronze-light">Axis</span>
                <span className="text-lg font-serif font-bold">Legis</span>
              </div>
              <p className="text-primary-foreground/45 text-xs font-light max-w-sm">
                Tecnologia jurídica integrada com privacidade absoluta e governança inteligente de dados.
              </p>
            </div>
            
            <div className="space-y-2 text-center md:text-right">
              <p className="text-xs text-primary-foreground/60 font-medium">
                Conectado ao ecossistema principal:
              </p>
              <a 
                href="https://andreandrade.adv.br" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm text-bronze-light hover:text-white transition-colors underline underline-offset-4"
              >
                andreandrade.adv.br
              </a>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 text-[10px] text-primary-foreground/30 font-sans space-y-4">
            <p className="leading-relaxed text-center">
              <strong>Compromisso Ético e Regulatório:</strong> Este website possui finalidade institucional e informativa. Os dados coletados de forma voluntária por meio de formulários ou assistentes virtuais são tratados com o único propósito de viabilizar demonstrações e contatos profissionais solicitados pelo usuário, sob os critérios da Lei Geral de Proteção de Dados (LGPD).
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p>© {new Date().getFullYear()} Axis Legis. Todos os direitos reservados. Tecnologia jurídica com privacidade absoluta.</p>
              
              <div className="flex gap-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="hover:text-white transition-colors cursor-pointer">Termos de Uso</button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card text-foreground border-border">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-xl text-navy">Termos de Uso</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-xs leading-relaxed text-muted-foreground pt-4">
                      <p><strong>Última atualização: Maio de 2026</strong></p>
                      <p>Bem-vindo ao website da Axis Legis. Ao acessar e interagir com este site ou utilizar nosso assistente virtual, você concorda em cumprir estes Termos de Uso.</p>
                      <h4 className="font-semibold text-foreground">1. Objeto do Serviço</h4>
                      <p>A Axis Legis disponibiliza informações institucionais sobre suas ferramentas de automação jurídica e um assistente virtual de demonstração de inteligência artificial. O uso do assistente serve exclusivamente para ilustrar as capacidades da tecnologia.</p>
                      <h4 className="font-semibold text-foreground">2. Limitação de Responsabilidade</h4>
                      <p>O conteúdo deste site e as respostas geradas pelo assistente virtual têm caráter meramente demonstrativo e informativo, não constituindo de forma alguma consultoria legal, parecer jurídico ou substituto à contratação profissional de advogados habilitados.</p>
                      <h4 className="font-semibold text-foreground">3. Direitos Autorais</h4>
                      <p>Todo o material, design, identidade visual e códigos contidos neste site são de propriedade da Axis Legis, protegidos pela legislação de direitos autorais e propriedade intelectual.</p>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <button className="hover:text-white transition-colors cursor-pointer">Políticas de Privacidade (LGPD)</button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card text-foreground border-border">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-xl text-navy">Política de Privacidade (LGPD)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-xs leading-relaxed text-muted-foreground pt-4">
                      <p><strong>Última atualização: Maio de 2026</strong></p>
                      <p>A Axis Legis valoriza e respeita a sua privacidade. Esta política descreve como tratamos os dados coletados neste website de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/18 - LGPD).</p>
                      <h4 className="font-semibold text-foreground">1. Quais dados coletamos?</h4>
                      <p>Coletamos dados fornecidos voluntariamente por você através do nosso formulário de contato (nome e e-mail profissional) e mensagens enviadas ao nosso assistente virtual.</p>
                      <h4 className="font-semibold text-foreground">2. Finalidade do Tratamento</h4>
                      <p>Os dados profissionais e as interações do chat são utilizados única e exclusivamente para responder suas solicitações de contato, agendar demonstrações de ferramentas e fornecer uma experiência interativa ilustrativa.</p>
                      <h4 className="font-semibold text-foreground">3. Armazenamento e Criptografia</h4>
                      <p>Todas as interações e registros de mensagens são armazenados de forma criptografada em nosso banco de dados seguro, com RLS (Row Level Security) habilitado por padrão. Nenhuma informação é compartilhada com terceiros.</p>
                      <h4 className="font-semibold text-foreground">4. Direitos do Titular (Artigo 18 da LGPD)</h4>
                      <p>A qualquer momento, você poderá solicitar o acesso, retificação ou exclusão permanente de suas informações pessoais enviando uma mensagem pelo nosso formulário de contato.</p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FooterCTA;
