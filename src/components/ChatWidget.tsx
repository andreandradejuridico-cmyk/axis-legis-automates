import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string; quickReplies?: string[] };

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
  const [initialOptions, setInitialOptions] = useState<string[]>([]);
  const [agentName, setAgentName] = useState("Axis IA");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase
      .from("ai_agent_public_config")
      .select("welcome_message, agent_name, initial_options, enabled")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWelcome(data.welcome_message);
          setAgentName(data.agent_name);
          setInitialOptions(data.initial_options || []);
        }
      });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading && open) {
      inputRef.current?.focus();
    }
  }, [loading, open]);

  const handleInputHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const element = e.target;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
    setInput(element.value);
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride || input).trim();
    if (!text || loading) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: { sessionId: getSessionId(), message: text },
        headers: {
          "x-client-info": "axis-chat-widget",
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (error) throw error;
      
      // Se a Edge Function retornou 200 mas incluiu um erro no JSON
      if (data && data.error) {
        console.error("Backend Error:", data.error);
        setMessages((m) => [...m, { 
          role: "assistant", 
          content: `Erro do Sistema: ${data.error}`
        }]);
        setLoading(false);
        return;
      }

      setMessages((m) => [...m, { 
        role: "assistant", 
        content: data.reply,
        quickReplies: data.quickReplies || [] 
      }]);
    } catch (e: any) {
      console.error("ChatWidget error:", e);
      // Extrair mensagem de erro se disponível para ajudar no debug
      const errDetail = e?.message || e?.error || "Erro desconhecido";
      console.log("Detalhes do erro:", errDetail);
      
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Desculpe, o servidor está indisponível no momento. Se o problema persistir, contate o administrador." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 pl-4 pr-6 py-3.5 rounded-full bg-gradient-to-r from-bronze via-bronze-light to-bronze text-accent-foreground shadow-bronze font-sans font-bold hover:brightness-110 transition-all duration-300 border border-white/10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: open ? 0 : [1, 1.04, 1],
          opacity: open ? 0 : 1,
        }}
        transition={{
          scale: open
            ? { type: "spring", stiffness: 260, damping: 20 }
            : { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 0.4 },
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Abrir chat com atendente virtual"
      >
        <span className="relative flex h-10 w-10 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-white/35 animate-ping" />
          <MessageCircle size={24} className="relative" />
        </span>
        <span className="hidden sm:inline text-xs tracking-wider uppercase">Falar com Assistente</span>
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

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="bg-bronze/10 border border-bronze/20 text-primary-foreground/90 text-sm rounded-lg px-3 py-2.5">
                {welcome}
              </div>
              {messages.length === 0 && initialOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-start pl-2">
                  {initialOptions.map((reply, idx) => (
                    <button
                      key={idx}
                      onClick={() => send(reply)}
                      disabled={loading}
                      className="bg-primary border border-bronze/40 text-bronze-light hover:bg-bronze hover:text-accent-foreground transition-all px-3 py-1.5 rounded-full text-xs font-medium shadow-sm"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className="space-y-2">
                  <div
                    className={`max-w-[85%] text-sm rounded-lg px-3 py-2.5 ${
                      m.role === "user"
                        ? "ml-auto bg-bronze text-accent-foreground"
                        : "bg-primary-foreground/10 text-primary-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.quickReplies && i === messages.length - 1 && (
                    <div className="flex flex-wrap gap-2 justify-start pl-2">
                      {m.quickReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => send(reply)}
                          disabled={loading}
                          className="bg-primary border border-bronze/40 text-bronze-light hover:bg-bronze hover:text-accent-foreground transition-all px-3 py-1.5 rounded-full text-xs font-medium shadow-sm"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="bg-primary-foreground/10 text-primary-foreground inline-flex items-center gap-2 text-sm rounded-lg px-3 py-2.5">
                  <Loader2 size={14} className="animate-spin" /> digitando…
                </div>
              )}
            </div>

            <div className="border-t border-bronze/20 bg-primary p-3 space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputHeight}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Escreva sua mensagem…"
                  className="flex-1 bg-primary-foreground/5 border border-bronze/20 text-primary-foreground placeholder:text-primary-foreground/40 focus:border-bronze/50 focus:outline-none rounded-lg p-2.5 text-sm resize-none min-h-[40px] max-h-[120px] transition-all"
                  disabled={loading}
                  rows={1}
                />
                <Button type="submit" variant="hero" size="icon" disabled={loading || !input.trim()} className="mb-0.5">
                  <Send size={16} />
                </Button>
              </form>
              <p className="text-[9px] text-primary-foreground/30 text-center leading-none">
                Seus dados são tratados de forma privada, conforme as diretrizes da LGPD (maio/2026).
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
