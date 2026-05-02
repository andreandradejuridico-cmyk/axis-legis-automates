import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo-axis-legis-clean.png";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-md border-b border-silver/10"
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="container mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
        <a href="#" className="flex items-center" aria-label="Axis Legis">
          <img
            src={logo}
            alt="Axis Legis"
            className="h-12 md:h-14 w-auto object-contain drop-shadow-[0_2px_8px_rgba(192,196,204,0.25)]"
          />
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="md:hidden bg-primary border-t border-bronze/10 px-6 py-6 flex flex-col gap-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <a href="#servicos" onClick={() => setIsOpen(false)} className="text-sm font-medium text-primary-foreground/70 hover:text-bronze-light tracking-wide uppercase">Serviços</a>
            <a href="#diferencial" onClick={() => setIsOpen(false)} className="text-sm font-medium text-primary-foreground/70 hover:text-bronze-light tracking-wide uppercase">Diferencial LGPD</a>
            <a href="#contato" onClick={() => setIsOpen(false)} className="text-sm font-medium text-primary-foreground/70 hover:text-bronze-light tracking-wide uppercase">Contato</a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
