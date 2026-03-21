import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-primary/60" />

      <div className="relative z-10 container mx-auto px-6 text-center max-w-4xl pt-20">
        <p className="text-bronze-light font-sans text-sm tracking-[0.3em] uppercase mb-6 animate-fade-in opacity-0" style={{ animationDelay: "0.2s" }}>
          Automação Jurídica com Privacidade Absoluta
        </p>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-primary-foreground leading-tight mb-8 animate-fade-up opacity-0" style={{ animationDelay: "0.4s" }}>
          Recupere Suas{" "}
          <span className="text-gradient-bronze">Horas Faturáveis</span>
        </h1>

        <p className="text-lg md:text-xl text-primary-foreground/70 font-sans font-light max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up opacity-0" style={{ animationDelay: "0.6s" }}>
          A Axis Legis automatiza os fluxos operacionais do seu escritório com IA —
          sem que um único dado sensível saia do seu servidor privado.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up opacity-0" style={{ animationDelay: "0.8s" }}>
          <Button variant="hero" size="lg" asChild>
            <a href="#contato">Agende uma Demonstração Privada</a>
          </Button>
          <Button variant="hero-outline" size="lg" asChild>
            <a href="#diferencial">Conheça o Diferencial</a>
          </Button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
