import { Clock, FileWarning, ScrollText } from "lucide-react";
import { motion } from "framer-motion";

const pains = [
  {
    icon: Clock,
    pain: "Horas perdidas triando leads não qualificados",
    solution: "Nosso chatbot com IA qualifica e prioriza cada contato automaticamente, 24/7, via WhatsApp.",
  },
  {
    icon: FileWarning,
    pain: "Prazos apertados e risco de perda processual",
    solution: "Monitoramento automatizado de publicações e prazos com alertas inteligentes para sua equipe.",
  },
  {
    icon: ScrollText,
    pain: "Geração manual e repetitiva de contratos e documentos",
    solution: "Templates inteligentes com preenchimento automático alimentados por dados já existentes no seu sistema.",
  },
];

const PainSection = () => {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6 max-w-5xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-bronze font-sans text-sm tracking-[0.2em] uppercase mb-4">O problema</p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Seu Tempo é o Ativo Mais Caro do Escritório
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {pains.map((item, i) => (
            <motion.div
              key={i}
              className="group"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
            >
              <div className="bg-card rounded-lg p-8 shadow-card border border-border hover:border-bronze/30 transition-all duration-300 h-full flex flex-col hover:-translate-y-1">
                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center mb-6 group-hover:bg-bronze/10 transition-colors">
                  <item.icon className="w-6 h-6 text-bronze" />
                </div>
                <p className="font-serif text-lg font-semibold text-foreground mb-3">
                  {item.pain}
                </p>
                <div className="w-8 h-px bg-bronze/40 mb-4" />
                <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                  {item.solution}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PainSection;
