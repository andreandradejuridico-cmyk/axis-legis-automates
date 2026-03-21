import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PainSection from "@/components/PainSection";
import ServicesSection from "@/components/ServicesSection";
import AuthoritySection from "@/components/AuthoritySection";
import ProcessSection from "@/components/ProcessSection";
import FooterCTA from "@/components/FooterCTA";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <PainSection />
      <ServicesSection />
      <AuthoritySection />
      <ProcessSection />
      <FooterCTA />
    </div>
  );
};

export default Index;
