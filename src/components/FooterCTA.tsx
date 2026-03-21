import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const FooterCTA = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Mensagem enviada com sucesso. Entraremos em contato em breve.");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <section id="contato" className="py-24 md:py-32 bg-navy-gradient text-primary-foreground">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-16">
          <p className="text-bronze-light font-sans text-sm tracking-[0.2em] uppercase mb-4">Contato</p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold">
            Pronto Para Automatizar com Segurança?
          </h2>
          <p className="mt-4 text-primary-foreground/50 max-w-lg mx-auto">
            Agende uma demonstração privada e descubra quantas horas faturáveis seu escritório está desperdiçando.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-5">
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
          <Button variant="hero" size="lg" className="w-full">
            Solicitar Demonstração
          </Button>
        </form>

        <div className="mt-20 pt-10 border-t border-bronze/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-1">
            <span className="text-lg font-sans font-bold text-bronze-light">Axis</span>
            <span className="text-lg font-serif font-bold">Legis</span>
          </div>
          <p className="text-primary-foreground/30 text-xs font-sans">
            © {new Date().getFullYear()} Axis Legis. Todos os direitos reservados. Tecnologia jurídica com privacidade absoluta.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FooterCTA;
