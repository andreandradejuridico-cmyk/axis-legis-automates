import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "axis_chat_session";

const getSessionId = () => {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `web-${crypto.randomUUID()}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [welcome, setWelcome] = useState("Olá. Como posso ajudar?");
  const [agentName, setAgentName] = useState("Axis IA");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("ai_agent_config")
      .select("welcome_message, agent_name, enabled")
      .eq("enabled", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWelcome(data.welcome_message);
          setAgentName(data.agent_name);
        }
      });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: { sessionId: getSessionId(), message: text },
      });
      if (error) throw error;
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Desculpe, houve um erro. Tente novamente em instantes." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-bronze text-accent-foreground shadow-bronze flex items-center justify-center hover:bg-bronze-glow transition-colors"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: open ? 0 : 1, opacity: open ? 0 : 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        aria-label="Abrir chat"
      >
        <MessageCircle size={24} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm h-[70vh] max-h-[560px] rounded-xl bg-primary border border-bronze/30 shadow-premium flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bg-navy-gradient px-5 py-4 flex items-center justify-between border-b border-bronze/20">
              <div>
                <p className="text-bronze-light text-[10px] font-sans tracking-[0.2em] uppercase">Axis Legis</p>
                <p className="text-primary-foreground font-serif text-base">{agentName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-primary-foreground/60 hover:text-primary-foreground"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <div className="bg-bronze/10 border border-bronze/20 text-primary-foreground/90 text-sm rounded-lg px-3 py-2.5">
                {welcome}
              </div>
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] text-sm rounded-lg px-3 py-2.5 ${
                    m.role === "user"
                      ? "ml-auto bg-bronze text-accent-foreground"
                      : "bg-primary-foreground/10 text-primary-foreground"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="bg-primary-foreground/10 text-primary-foreground inline-flex items-center gap-2 text-sm rounded-lg px-3 py-2.5">
                  <Loader2 size={14} className="animate-spin" /> digitando…
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 p-3 border-t border-bronze/20 bg-primary"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreva sua mensagem…"
                className="bg-primary-foreground/5 border-bronze/20 text-primary-foreground placeholder:text-primary-foreground/40 focus:border-bronze/50"
                disabled={loading}
              />
              <Button type="submit" variant="hero" size="icon" disabled={loading || !input.trim()}>
                <Send size={16} />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
