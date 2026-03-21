const steps = [
  {
    number: "01",
    title: "Diagnóstico",
    description: "Mapeamos os fluxos operacionais do seu escritório, identificando gargalos, tarefas repetitivas e oportunidades de automação com total sigilo.",
  },
  {
    number: "02",
    title: "Implementação Dedicada",
    description: "Instalamos e configuramos toda a infraestrutura de automação no seu servidor privado. IA, chatbots, fluxos n8n — tudo dentro do seu domínio.",
  },
  {
    number: "03",
    title: "Manutenção e Evolução",
    description: "Monitoramento contínuo, atualizações de segurança e evolução dos fluxos conforme o escritório cresce. Suporte dedicado e discreto.",
  },
];

const ProcessSection = () => {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-16">
          <p className="text-bronze font-sans text-sm tracking-[0.2em] uppercase mb-4">Processo</p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Três Etapas para a Excelência Operacional
          </h2>
        </div>

        <div className="space-y-12">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-8 items-start group">
              <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-bronze/30 flex items-center justify-center group-hover:border-bronze group-hover:bg-bronze/5 transition-all duration-300">
                <span className="text-bronze font-sans font-bold text-lg">{step.number}</span>
              </div>
              <div className="pt-2">
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
