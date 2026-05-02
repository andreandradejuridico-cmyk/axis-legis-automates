import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const WhatsAppButton = () => {
  const [phone, setPhone] = useState<string>("");

  useEffect(() => {
    supabase
      .from("whatsapp_settings")
      .select("default_number")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.default_number) setPhone(data.default_number.replace(/\D/g, ""));
      });
  }, []);

  const href = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre a Axis Legis.")}`
    : "#contato";

  return (
    <motion.a
      href={href}
      target={phone ? "_blank" : undefined}
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-6 left-6 z-40 flex items-center gap-3 pl-4 pr-5 py-3.5 rounded-full bg-[#25D366] text-white shadow-[0_10px_40px_-8px_rgba(37,211,102,0.6)] font-sans font-semibold"
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [1, 1.06, 1],
        opacity: 1,
      }}
      transition={{
        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        opacity: { duration: 0.6, delay: 0.8 },
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="relative flex h-11 w-11 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
        <MessageCircle size={26} className="relative" fill="white" />
      </span>
      <span className="hidden sm:inline text-sm tracking-wide">Fale no WhatsApp</span>
    </motion.a>
  );
};

export default WhatsAppButton;
