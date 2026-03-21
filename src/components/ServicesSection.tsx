import { MessageSquare, FileSearch, Bell } from "lucide-react";

const services = [
  {
    icon: MessageSquare,
    title: "Triagem Inteligente",
    description: "Chatbot profissional via WhatsApp com IA integrada. Qualifica leads, agenda reuniões e encaminha ao advogado correto — tudo antes do primeiro contato humano.",
    tag: "WhatsApp Bot + IA",
  },
  {
    icon: FileSearch,
    title: "Análise de Documentos via IA",
    description: "Análise automatizada de petições, contratos e peças processuais. Extração de cláusulas-chave, identificação de riscos e sumarização em minutos, não em horas.",
    tag: "NLP Jurídico",
  },
  {
    icon: Bell,
    title: "Monitoramento de Prazos",
    description: "Sistema automatizado de alertas processuais integrado ao fluxo do escritório. Nunca mais perca um prazo por falha humana ou sobrecarga operacional.",
    tag: "Automação n8n",
  },
];

const ServicesSection = () => {
  return (
    <section id="servicos" className="py-24 md:py-32 bg-muted/50">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center mb-16">
          <p className="text-bronze font-sans text-sm tracking-[0.2em] uppercase mb-4">Soluções</p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Ecossistema de Automação Jurídica
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, i) => (
            <div key={i} className="group bg-card rounded-lg p-8 shadow-card border border-border hover:shadow-premium hover:border-bronze/20 transition-all duration-500">
              <span className="inline-block text-xs font-sans font-semibold tracking-wider uppercase text-bronze bg-bronze/10 px-3 py-1 rounded-sm mb-6">
                {service.tag}
              </span>
              <div className="w-14 h-14 rounded-md bg-primary/5 flex items-center justify-center mb-6 group-hover:bg-bronze/10 transition-colors">
                <service.icon className="w-7 h-7 text-bronze" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground mb-3">
                {service.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
