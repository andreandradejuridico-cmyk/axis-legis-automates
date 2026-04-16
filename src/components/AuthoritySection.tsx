import { Shield, Server, Lock } from "lucide-react";
import { motion } from "framer-motion";

const items = [
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
];

const AuthoritySection = () => {
  return (
    <section id="diferencial" className="py-24 md:py-32 bg-navy-gradient text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 49px, hsl(35 50% 45%) 49px, hsl(35 50% 45%) 50px), repeating-linear-gradient(90deg, transparent, transparent 49px, hsl(35 50% 45%) 49px, hsl(35 50% 45%) 50px)`
      }} />

      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-bronze-light font-sans text-sm tracking-[0.2em] uppercase mb-4">Infraestrutura Exclusiva</p>
          <h2 className="text-3xl md:text-5xl font-serif font-bold leading-tight">
            Bunker <span className="text-gradient-bronze">Axis</span>
          </h2>
          <p className="mt-6 text-primary-foreground/60 max-w-2xl mx-auto leading-relaxed">
            A única solução de automação jurídica no Brasil que opera inteiramente dentro do seu servidor privado dedicado. Seus dados nunca "viajam" para nuvens de terceiros.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {items.map((item, i) => (
            <motion.div
              key={i}
              className="text-center p-8 rounded-lg border border-bronze/15 bg-primary-foreground/[0.03] backdrop-blur-sm hover:-translate-y-1 transition-transform duration-300"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
            >
              <div className="w-14 h-14 rounded-full border border-bronze/30 flex items-center justify-center mx-auto mb-6">
                <item.icon className="w-6 h-6 text-bronze-light" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-lg font-bold mb-3">{item.title}</h3>
              <p className="text-primary-foreground/50 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <p className="text-xs font-sans tracking-widest uppercase text-bronze-light/60">
            Enquanto outros automatizam com risco, você automatiza com blindagem.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default AuthoritySection;
