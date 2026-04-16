import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.8, ease: "easeOut" }}
      />
      <div className="absolute inset-0 bg-primary/60" />

      <div className="relative z-10 container mx-auto px-6 text-center max-w-4xl pt-20">
        <motion.p
          className="text-bronze-light font-sans text-sm tracking-[0.3em] uppercase mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          Automação Jurídica com Privacidade Absoluta
        </motion.p>

        <motion.h1
          className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-primary-foreground leading-tight mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          Recupere Suas{" "}
          <span className="text-gradient-bronze">Horas Faturáveis</span>
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-primary-foreground/70 font-sans font-light max-w-2xl mx-auto mb-12 leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          A Axis Legis automatiza os fluxos operacionais do seu escritório com IA —
          sem que um único dado sensível saia do seu servidor privado.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          <Button variant="hero" size="lg" asChild>
            <a href="#contato">Agende uma Demonstração Privada</a>
          </Button>
          <Button variant="hero-outline" size="lg" asChild>
            <a href="#diferencial">Conheça o Diferencial</a>
          </Button>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
