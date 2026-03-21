import { Shield, Server, Lock } from "lucide-react";

const AuthoritySection = () => {
  return (
    <section id="diferencial" className="py-24 md:py-32 bg-navy-gradient text-primary-foreground relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 49px, hsl(35 50% 45%) 49px, hsl(35 50% 45%) 50px), repeating-linear-gradient(90deg, transparent, transparent 49px, hsl(35 50% 45%) 49px, hsl(35 50% 45%) 50px)`
      }} />

      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        <div className="text-center mb-16">
          <p className="text-bronze-light font-sans text-sm tracking-[0.2em] uppercase mb-4">Infraestrutura Exclusiva</p>
          <h2 className="text-3xl md:text-5xl font-serif font-bold leading-tight">
            Bunker <span className="text-gradient-bronze">Axis</span>
          </h2>
          <p className="mt-6 text-primary-foreground/60 max-w-2xl mx-auto leading-relaxed">
            A única solução de automação jurídica no Brasil que opera inteiramente dentro do seu servidor privado dedicado. Seus dados nunca "viajam" para nuvens de terceiros.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: Server,
              title: "Self-Hosted",
              desc: "Toda a infraestrutura roda em um servidor dedicado exclusivo do seu escritório. Sem SaaS, sem compartilhamento.",
            },
            {
              icon: Lock,
              title: "LGPD Nativa",
              desc: "100% de conformidade com a Lei Geral de Proteção de Dados. Os dados sensíveis dos seus clientes nunca saem do seu domínio.",
            },
            {
              icon: Shield,
              title: "Sigilo Profissional",
              desc: "O dever de sigilo do advogado exige que informações de clientes não trafeguem por ferramentas SaaS comuns. A Axis Legis resolve isso.",
            },
          ].map((item, i) => (
            <div key={i} className="text-center p-8 rounded-lg border border-bronze/15 bg-primary-foreground/[0.03] backdrop-blur-sm">
              <div className="w-14 h-14 rounded-full border border-bronze/30 flex items-center justify-center mx-auto mb-6">
                <item.icon className="w-6 h-6 text-bronze-light" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-lg font-bold mb-3">{item.title}</h3>
              <p className="text-primary-foreground/50 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-xs font-sans tracking-widest uppercase text-bronze-light/60">
            Enquanto outros automatizam com risco, você automatiza com blindagem.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AuthoritySection;
