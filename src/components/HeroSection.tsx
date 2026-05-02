import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";
import logo from "@/assets/logo-axis-legis-clean.png";

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
      <div className="absolute inset-0 bg-primary/70" />

      <div className="relative z-10 container mx-auto px-6 pt-28 pb-16 grid lg:grid-cols-[auto,1fr] gap-12 lg:gap-16 items-center">
        <motion.div
          className="flex justify-center lg:justify-start"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <img
            src={logo}
            alt="Axis Legis"
            className="w-64 md:w-80 lg:w-[420px] h-auto object-contain drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
          />
        </motion.div>

        <div className="text-center lg:text-left max-w-2xl">
          <motion.p
            className="text-bronze-light font-sans text-xs md:text-sm tracking-[0.3em] uppercase mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            Automação Jurídica com Privacidade Absoluta
          </motion.p>

          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-primary-foreground leading-tight mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Recupere Suas{" "}
            <span className="text-gradient-bronze">Horas Faturáveis</span>
          </motion.h1>

          <motion.p
            className="text-base md:text-lg text-primary-foreground/70 font-sans font-light max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            A Axis Legis automatiza os fluxos operacionais do seu escritório com IA —
            sem que um único dado sensível saia do seu servidor privado.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
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
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
