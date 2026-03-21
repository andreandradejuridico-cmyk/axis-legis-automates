import { useState } from "react";
import { Menu, X } from "lucide-react";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-md border-b border-bronze/10">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <a href="#" className="flex items-center gap-1">
          <span className="text-2xl font-sans font-bold tracking-tight text-bronze-light">Axis</span>
          <span className="text-2xl font-serif font-bold tracking-tight text-primary-foreground">Legis</span>
        </a>

        <nav className="hidden md:flex items-center gap-10">
          <a href="#servicos" className="text-sm font-sans font-medium text-primary-foreground/70 hover:text-bronze-light transition-colors tracking-wide uppercase">
            Serviços
          </a>
          <a href="#diferencial" className="text-sm font-sans font-medium text-primary-foreground/70 hover:text-bronze-light transition-colors tracking-wide uppercase">
            Diferencial LGPD
          </a>
          <a href="#contato" className="text-sm font-sans font-medium text-primary-foreground/70 hover:text-bronze-light transition-colors tracking-wide uppercase">
            Contato
          </a>
        </nav>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-primary-foreground"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden bg-primary border-t border-bronze/10 px-6 py-6 flex flex-col gap-4">
          <a href="#servicos" onClick={() => setIsOpen(false)} className="text-sm font-medium text-primary-foreground/70 hover:text-bronze-light tracking-wide uppercase">Serviços</a>
          <a href="#diferencial" onClick={() => setIsOpen(false)} className="text-sm font-medium text-primary-foreground/70 hover:text-bronze-light tracking-wide uppercase">Diferencial LGPD</a>
          <a href="#contato" onClick={() => setIsOpen(false)} className="text-sm font-medium text-primary-foreground/70 hover:text-bronze-light tracking-wide uppercase">Contato</a>
        </div>
      )}
    </header>
  );
};

export default Header;
