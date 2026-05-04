import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, LogOut, MessageSquare, Bot, Smartphone, Users, LayoutDashboard, ChevronRight, Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomCalendar } from "@/components/CustomCalendar";

type AgentCfg = {
  id: string;
  agent_name: string;
  model: string;
  system_prompt: string;
  rules_prompt: string;
  welcome_message: string;
  initial_options: string[];
  temperature: number;
  enabled: boolean;
};

type WaCfg = {
  id: string;
  instance_name: string | null;
  default_number: string | null;
  connected: boolean;
  api_url: string | null;
  api_key: string | null;
};

type Conv = {
  id: string;
  session_id: string;
  channel: string;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: string;
};

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

type Appointment = {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  legal_area: string;
  subject: string;
  notes: string | null;
  appointment_time: string;
  status: string;
};

type BusinessHour = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
};

type Knowledge = {
  id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
};

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agent, setAgent] = useState<AgentCfg | null>(null);
  const [wa, setWa] = useState<WaCfg | null>(null);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conv | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const [activeSection, setActiveSection] = useState("overview");

  const load = async () => {
    setLoading(true);
    
    // Check if user is admin - Improved check
    const { data: sessionRes } = await supabase.auth.getSession();
    const user = sessionRes.session?.user;
    let adminCheck = false;
    
    if (user) {
      console.log("Logged in user ID:", user.id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      adminCheck = roles?.some(r => r.role === 'admin') || false;
      console.log("User roles found:", roles, "Is Admin:", adminCheck);
      setIsAdmin(adminCheck);
      
      if (adminCheck) {
        const { data: usersData, error: usersErr } = await supabase.rpc('get_all_users');
        if (usersErr) console.error("Error fetching users:", usersErr);
        if (usersData) setUsers(usersData);
      }
    }

    const [a, w, c, app, bh, k] = await Promise.all([
      adminCheck ? supabase.from("ai_agent_config").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
      adminCheck ? supabase.from("whatsapp_settings").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
      supabase.from("chat_conversations").select("*", { count: 'exact' }).order("created_at", { ascending: false }).limit(20),
      supabase.from("appointments").select("*").order("appointment_time", { ascending: true }).limit(100),
      supabase.from("business_hours").select("*").order("day_of_week", { ascending: true }),
      adminCheck ? supabase.from("agent_knowledge").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: null, error: null }),
    ]);

    if (c.error) console.error("Error fetching conversations:", c.error);
    console.log("Conversations fetched:", c.data?.length, "Total count:", c.count);

    setAgent(a.data as any);
    setWa(w.data as any);
    setConversations((c.data as any) ?? []);
    setAppointments((app.data as any) ?? []);
    setBusinessHours((bh.data as any) ?? []);
    setKnowledge((k.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const { error } = await supabase.rpc('set_user_role', { target_user_id: userId, new_role: newRole });
    if (error) {
      toast.error("Erro ao alterar permissão: " + error.message);
      return;
    }
    toast.success("Permissão alterada com sucesso!");
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const viewHistory = async (conv: Conv) => {
    setSelectedConv(conv);
    setLoadingMessages(true);
    setChatMessages([]);
    
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
      
    if (error) {
      toast.error("Erro ao carregar mensagens: " + error.message);
    } else {
      setChatMessages(data as ChatMessage[]);
    }
    setLoadingMessages(false);
  };

  const saveAgent = async () => {
    if (!agent) return;
    setSaving(true);
    const { error } = await supabase
      .from("ai_agent_config")
      .update({
        agent_name: agent.agent_name,
        model: agent.model,
        system_prompt: agent.system_prompt,
        rules_prompt: agent.rules_prompt,
        welcome_message: agent.welcome_message,
        initial_options: agent.initial_options,
        temperature: agent.temperature,
        enabled: agent.enabled,
      })
      .eq("id", agent.id);
    setSaving(false);
    error ? toast.error(error.message) : toast.success("Agente atualizado.");
  };

  const saveWa = async () => {
    if (!wa) return;
    setSaving(true);
    const { error } = await supabase
      .from("whatsapp_settings")
      .update({
        instance_name: wa.instance_name,
        default_number: wa.default_number,
        connected: wa.connected,
      })
      .eq("id", wa.id);
    setSaving(false);
    error ? toast.error(error.message) : toast.success("WhatsApp atualizado.");
  };

  const saveBusinessHours = async () => {
    setSaving(true);
    const promises = businessHours.map(bh => 
      supabase.from("business_hours").update({
        start_time: bh.start_time,
        end_time: bh.end_time,
        is_closed: bh.is_closed
      }).eq("id", bh.id)
    );
    await Promise.all(promises);
    setSaving(false);
    toast.success("Horários de funcionamento atualizados.");
  };

  const addKnowledge = async () => {
    const { data, error } = await supabase.from("agent_knowledge").insert({
      title: "Novo Tópico",
      content: "Conteúdo aqui...",
      category: "Geral"
    }).select().single();
    
    if (error) {
      toast.error("Erro ao adicionar: " + error.message);
    } else {
      setKnowledge([data as Knowledge, ...knowledge]);
      toast.success("Tópico adicionado.");
    }
  };

  const saveKnowledgeItem = async (item: Knowledge) => {
    setSaving(true);
    const { error } = await supabase.from("agent_knowledge").update({
      title: item.title,
      content: item.content,
      category: item.category,
      is_active: item.is_active
    }).eq("id", item.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Conteúdo atualizado.");
  };

  const deleteKnowledge = async (id: string) => {
    const { error } = await supabase.from("agent_knowledge").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setKnowledge(knowledge.filter(k => k.id !== id));
      toast.success("Removido.");
    }
  };

  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal text-silver">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-bronze" size={32} />
          <p className="tracking-widest uppercase text-xs">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "overview", icon: LayoutDashboard, label: "Visão Geral", show: true },
    { id: "agenda", icon: Calendar, label: "Agenda", show: true },
    { id: "hours", icon: Clock, label: "Horários", show: isAdmin },
    { id: "conversations", icon: MessageSquare, label: "Conversas", show: true },
    { id: "agent", icon: Bot, label: "Agente IA", show: isAdmin && !!agent },
    { id: "knowledge", icon: Users, label: "Conhecimento", show: isAdmin },
    { id: "whatsapp", icon: Smartphone, label: "WhatsApp", show: isAdmin && !!wa },
    { id: "users", icon: Users, label: "Permissões", show: isAdmin },
  ];

  return (
    <div className="flex h-screen bg-[#1a1c23] text-silver-light overflow-hidden font-sans">
      
      {/* Sidebar Elegante */}
      <aside className="w-72 flex flex-col border-r border-white/5 z-20">
        <div className="p-8">
          <h1 className="font-serif text-3xl text-white tracking-wide">Axis<span className="text-bronze">Legis</span></h1>
          <p className="text-[10px] text-silver-dark tracking-[0.3em] uppercase mt-2">Boutique Jurídica</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group
                  ${isActive 
                    ? 'text-white bg-white/10 font-medium' 
                    : 'text-silver hover:text-white hover:bg-white/5'
                  }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-bronze rounded-r-md"></div>
                )}
                <item.icon size={18} className={isActive ? 'text-bronze' : 'text-silver-dark group-hover:text-silver'} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-silver-dark hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content Area (Glassmorphism / Premium Look) */}
      <main className="flex-1 bg-background text-foreground flex flex-col relative z-10 shadow-[-20px_0_40px_rgba(0,0,0,0.4)] rounded-tl-3xl overflow-hidden m-2 ml-0 border border-white/10">
        
        {/* Header Title */}
        <header className="h-24 border-b border-border/50 flex items-center justify-between px-10 bg-card/80 backdrop-blur-md sticky top-0 z-10">
           <h2 className="text-2xl font-serif text-navy tracking-tight">
             {navItems.find(i => i.id === activeSection)?.label}
           </h2>
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-bronze/20 flex items-center justify-center border border-bronze/30">
                <Users size={14} className="text-bronze-charcoal" />
             </div>
             <span className="text-sm font-medium text-muted-foreground">{isAdmin ? 'Administrador' : 'Atendente'}</span>
           </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-10 relative">
          
          {/* SECTION: VISÃO GERAL */}
          {activeSection === "overview" && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-gradient-to-br from-[#1a1c23] to-[#2c303a] p-10 rounded-3xl text-white shadow-premium relative overflow-hidden border border-white/10">
                <div className="relative z-10">
                  <h2 className="font-serif text-4xl mb-3 text-white">Painel de Controle</h2>
                  <p className="text-silver max-w-xl leading-relaxed text-sm">
                    Acompanhe em tempo real as conversas ativas, configure as respostas automáticas da sua IA e verifique a saúde das conexões de mensageria.
                  </p>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
                   <Bot size={280} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="shadow-card border-border/50 bg-card/50 backdrop-blur-sm rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                       <div>
                         <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Conversas Registradas</p>
                         <h3 className="text-4xl font-bold mt-2 text-navy">{conversations.length}</h3>
                       </div>
                       <div className="p-4 bg-bronze/10 rounded-2xl text-bronze"><MessageSquare size={24} /></div>
                    </div>
                  </CardContent>
                </Card>
                
                {isAdmin && agent && (
                <Card className="shadow-card border-border/50 bg-card/50 backdrop-blur-sm rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                       <div>
                         <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status do Agente IA</p>
                         <h3 className="text-2xl font-bold mt-4 flex items-center gap-2">
                           {agent.enabled 
                             ? <><span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span> <span className="text-green-600">Ativo no site</span></> 
                             : <><span className="w-3 h-3 rounded-full bg-red-500"></span> <span className="text-muted-foreground">Pausado</span></>}
                         </h3>
                       </div>
                       <div className="p-4 bg-charcoal/5 rounded-2xl text-charcoal"><Bot size={24} /></div>
                    </div>
                  </CardContent>
                </Card>
                )}

                {isAdmin && wa && (
                <Card className="shadow-card border-border/50 bg-card/50 backdrop-blur-sm rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                       <div>
                         <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Conexão WhatsApp</p>
                         <h3 className="text-2xl font-bold mt-4 flex items-center gap-2">
                           {wa.connected 
                             ? <><span className="text-green-600">Online</span></> 
                             : <><span className="text-red-500">Offline</span></>}
                         </h3>
                       </div>
                       <div className="p-4 bg-charcoal/5 rounded-2xl text-charcoal"><Smartphone size={24} /></div>
                    </div>
                  </CardContent>
                </Card>
                )}
              </div>
            </div>
          )}

          {/* SECTION: AGENDA */}
          {activeSection === "agenda" && (
            <div className="animate-fade-in space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-navy text-white border-none rounded-2xl shadow-premium overflow-hidden relative">
                   <CardContent className="p-6">
                      <p className="text-silver-light text-xs uppercase tracking-widest font-medium">Total de Agendamentos</p>
                      <h3 className="text-4xl font-serif mt-2">{appointments.length}</h3>
                      <Calendar className="absolute -right-4 -bottom-4 opacity-10" size={100} />
                   </CardContent>
                </Card>
                <Card className="bg-white border-border/50 rounded-2xl shadow-card">
                   <CardContent className="p-6">
                      <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium">Próximo Compromisso</p>
                      <h3 className="text-xl font-bold mt-2 text-navy">
                        {appointments.length > 0 
                          ? new Date(appointments[0].appointment_time).toLocaleDateString("pt-BR")
                          : "Nenhum"}
                      </h3>
                   </CardContent>
                </Card>
                <Card className="bg-white border-border/50 rounded-2xl shadow-card">
                   <CardContent className="p-6">
                      <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium">Taxa de Conversão</p>
                      <h3 className="text-xl font-bold mt-2 text-bronze">Alta</h3>
                   </CardContent>
                </Card>
              </div>

              <CustomCalendar appointments={appointments} />
            </div>
          )}

          {/* SECTION: HORARIOS */}
          {activeSection === "hours" && isAdmin && (
            <div className="animate-fade-in max-w-4xl">
              <Card className="border-border/50 shadow-card rounded-2xl bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-serif text-navy">Horários de Atendimento</h3>
                      <p className="text-sm text-muted-foreground">Defina as faixas de horário que a IA pode oferecer aos clientes.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {businessHours.map((bh, idx) => (
                      <div key={bh.id} className="flex items-center gap-6 p-4 bg-muted/20 rounded-xl border border-border/30">
                        <div className="w-32 font-semibold text-navy">{dayNames[bh.day_of_week]}</div>
                        
                        <div className="flex-1 flex items-center gap-4">
                          <Input
                            type="time"
                            disabled={bh.is_closed}
                            value={bh.start_time.substring(0, 5)}
                            onChange={(e) => {
                              const newHours = [...businessHours];
                              newHours[idx].start_time = e.target.value;
                              setBusinessHours(newHours);
                            }}
                            className="bg-white border-border w-32"
                          />
                          <span className="text-muted-foreground">até</span>
                          <Input
                            type="time"
                            disabled={bh.is_closed}
                            value={bh.end_time.substring(0, 5)}
                            onChange={(e) => {
                              const newHours = [...businessHours];
                              newHours[idx].end_time = e.target.value;
                              setBusinessHours(newHours);
                            }}
                            className="bg-white border-border w-32"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Fechado</Label>
                          <Switch
                            checked={bh.is_closed}
                            onCheckedChange={(v) => {
                              const newHours = [...businessHours];
                              newHours[idx].is_closed = v;
                              setBusinessHours(newHours);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6">
                    <Button onClick={saveBusinessHours} disabled={saving} className="bg-charcoal hover:bg-navy text-white px-8 h-12 rounded-xl shadow-md w-full sm:w-auto">
                      {saving ? <Loader2 className="animate-spin mr-2" /> : <Clock size={18} className="mr-2" />}
                      Salvar Grade de Horários
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SECTION: CONVERSAS */}
          {activeSection === "conversations" && (
            <div className="animate-fade-in">
              <Card className="border-border/50 shadow-card rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                  {conversations.length === 0 ? (
                    <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
                      <MessageSquare size={48} className="opacity-20 mb-4" />
                      <p className="text-lg">Nenhuma conversa registrada ainda.</p>
                      <p className="text-sm mt-1">As interações dos usuários com a IA aparecerão aqui.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {conversations.map((c) => (
                        <div key={c.id} className="p-6 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center text-navy font-serif font-bold">
                              {c.contact_name ? c.contact_name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-lg">{c.contact_name || c.contact_phone || "Visitante Anônimo"}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span className="uppercase font-mono tracking-wider bg-muted px-2 py-0.5 rounded-md text-[10px]">{c.channel}</span> 
                                <span>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full px-6 border-border" 
                            onClick={() => viewHistory(c)}
                          >
                            Ler Transcrição <ChevronRight size={14} className="ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Modal de Histórico */}
              <Dialog open={!!selectedConv} onOpenChange={(o) => !o && setSelectedConv(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-border/50 shadow-premium">
                  <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/20">
                    <DialogTitle className="font-serif text-xl text-navy">
                      Transcrição da Conversa
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8f9fa]">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-bronze" size={32} />
                      </div>
                    ) : chatMessages.length === 0 ? (
                      <p className="text-center text-muted-foreground py-20">Nenhuma mensagem salva para esta sessão.</p>
                    ) : (
                      chatMessages.map(msg => (
                        <div key={msg.id} className={`flex flex-col w-fit max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-1.5 px-1">
                            {msg.role === 'user' ? 'Cliente' : 'Axis Legis IA'}
                          </span>
                          <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-[#1a1c23] text-white rounded-tr-sm' 
                            : 'bg-white border border-border/50 text-foreground rounded-tl-sm'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* SECTION: AGENTE IA */}
          {activeSection === "agent" && isAdmin && agent && (
            <div className="animate-fade-in max-w-4xl">
              <Card className="border-border/50 shadow-card rounded-2xl bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 grid gap-8">
                  
                  <div className="flex items-center justify-between pb-6 border-b border-border/50">
                    <div>
                      <h3 className="text-lg font-serif text-navy">Controle de Status</h3>
                      <p className="text-sm text-muted-foreground">Ative ou pause as respostas automáticas da inteligência artificial.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="agent-active" className="font-medium cursor-pointer">Visível no Site</Label>
                      <Switch
                        id="agent-active"
                        checked={agent.enabled}
                        onCheckedChange={(v) => setAgent({ ...agent, enabled: v })}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Nome de Exibição</Label>
                      <Input
                        value={agent.agent_name}
                        onChange={(e) => setAgent({ ...agent, agent_name: e.target.value })}
                        className="bg-background h-12 rounded-xl border-border"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Motor de IA (Modelo)</Label>
                      <Input
                        value={agent.model}
                        onChange={(e) => setAgent({ ...agent, model: e.target.value })}
                        placeholder="Ex: gpt-4o"
                        className="bg-background font-mono text-sm h-12 rounded-xl border-border"
                      />
                      <p className="text-[10px] text-muted-foreground italic">
                        Você pode usar qualquer modelo suportado. Ex: <span className="font-mono bg-muted px-1 rounded">gpt-4o</span>, <span className="font-mono bg-muted px-1 rounded">gpt-4o-mini</span>, <span className="font-mono bg-muted px-1 rounded">claude-3-5-sonnet-20240620</span>.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Mensagem de Boas-vindas</Label>
                    <Textarea
                      value={agent.welcome_message}
                      onChange={(e) => setAgent({ ...agent, welcome_message: e.target.value })}
                      rows={2}
                      className="resize-none bg-background rounded-xl border-border p-4"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs flex justify-between">
                      <span>Prompt do Sistema (Diretrizes)</span>
                    </Label>
                    <Textarea
                      value={agent.system_prompt}
                      onChange={(e) => setAgent({ ...agent, system_prompt: e.target.value })}
                      rows={10}
                      className="bg-background font-mono text-sm leading-relaxed rounded-xl border-border p-4 shadow-inner"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-bronze font-bold uppercase tracking-wider text-xs flex justify-between">
                      <span>Regras Sagradas (Manual de Operação - NÃO PODE QUEBRAR)</span>
                    </Label>
                    <Textarea
                      value={agent.rules_prompt}
                      onChange={(e) => setAgent({ ...agent, rules_prompt: e.target.value })}
                      rows={10}
                      className="bg-bronze/5 font-mono text-sm leading-relaxed rounded-xl border-bronze/20 p-4 shadow-inner text-navy"
                      placeholder="Ex: Peça os dados um por um..."
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">
                      Botões de Resposta Rápida (Separados por vírgula)
                    </Label>
                    <Input
                      value={agent.initial_options?.join(", ") || ""}
                      onChange={(e) => {
                        const opts = e.target.value.split(",").map(s => s.trim()).filter(s => s !== "");
                        setAgent({ ...agent, initial_options: opts });
                      }}
                      placeholder="Ex: Escritório, 3º Setor, Advogado Particular"
                      className="bg-background h-12 rounded-xl border-border"
                    />
                    <p className="text-[10px] text-muted-foreground italic">Estes botões aparecerão automaticamente para o cliente no início da conversa.</p>
                  </div>
                  
                  <div className="space-y-6 pt-4 bg-muted/30 p-6 rounded-2xl border border-border/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="text-navy font-medium">Temperatura (Nível de Criatividade)</Label>
                        <p className="text-xs text-muted-foreground mt-1">Controla o quão determinísticas ou criativas as respostas serão.</p>
                      </div>
                      <span className="text-xl font-mono font-bold text-charcoal bg-white shadow-sm px-4 py-1.5 rounded-lg border border-border">
                        {agent.temperature.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[agent.temperature]}
                      min={0}
                      max={2}
                      step={0.1}
                      onValueChange={([v]) => setAgent({ ...agent, temperature: v })}
                      className="py-2"
                    />
                  </div>
                  
                  <div className="pt-6">
                    <Button onClick={saveAgent} disabled={saving} className="bg-charcoal hover:bg-navy text-white px-8 h-12 rounded-xl shadow-md w-full sm:w-auto transition-all">
                      {saving ? <Loader2 className="animate-spin mr-2" /> : <Bot size={18} className="mr-2" />}
                      Salvar Alterações do Agente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SECTION: WHATSAPP */}
          {activeSection === "whatsapp" && isAdmin && wa && (
            <div className="animate-fade-in max-w-4xl">
              <Card className="border-border/50 shadow-card rounded-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
                <CardContent className="p-8 grid gap-8">
                  
                  <div className="bg-charcoal/5 border border-charcoal/10 rounded-xl p-5 text-sm text-charcoal">
                    <p className="flex gap-3 items-start">
                      <span className="bg-charcoal text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">!</span>
                      <span>
                        <strong>Arquitetura de Segurança:</strong> As credenciais do WhatsApp (URL do Evolution, API Key) estão armazenadas de forma encriptada no cofre do servidor (Environment Secrets) e nunca transitam para esta interface web.
                      </span>
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Identificador da Instância</Label>
                      <Input
                        value={wa.instance_name ?? ""}
                        onChange={(e) => setWa({ ...wa, instance_name: e.target.value })}
                        className="bg-background h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Número Padrão (DDI+DDD+Num)</Label>
                      <Input
                        value={wa.default_number ?? ""}
                        onChange={(e) => setWa({ ...wa, default_number: e.target.value })}
                        placeholder="5511999999999"
                        className="bg-background h-12 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white border border-border shadow-sm p-6 rounded-xl">
                    <div>
                      <Label className="text-lg font-serif text-navy">Sincronização de Conexão</Label>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">Determine se o robô deve processar mensagens ou se o WhatsApp está desconectado na fonte.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md ${wa.connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {wa.connected ? 'Serviço Ativo' : 'Offline'}
                      </span>
                      <Switch
                        checked={wa.connected}
                        onCheckedChange={(v) => setWa({ ...wa, connected: v })}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Instância Evolution</Label>
                      <Input 
                        value={wa.instance_name || ""} 
                        onChange={(e) => setWa({ ...wa, instance_name: e.target.value })}
                        placeholder="Ex: AxisLegis_01"
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">API Key (Token)</Label>
                      <Input 
                        type="password"
                        value={wa.api_key || ""} 
                        onChange={(e) => setWa({ ...wa, api_key: e.target.value })}
                        placeholder="••••••••••••••••"
                        className="bg-background border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">URL da Evolution API</Label>
                    <Input 
                      value={wa.api_url || ""} 
                      onChange={(e) => setWa({ ...wa, api_url: e.target.value })}
                      placeholder="https://sua-api.evolution-api.com"
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Endpoint do Webhook (Copie para a Evolution API)</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-[#1a1c23] text-silver p-4 rounded-xl text-sm font-mono break-all border border-[#2c303a] shadow-inner select-all">
                        {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`}
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`);
                          toast.success("Webhook copiado!");
                        }}
                      >
                        <Bot size={18} />
                      </Button>
                    </div>
                  </div>

                  <div className="pt-6 flex flex-wrap gap-4">
                    <Button onClick={saveWa} disabled={saving} className="bg-charcoal hover:bg-navy text-white px-8 h-12 rounded-xl shadow-md transition-all">
                      {saving ? <Loader2 className="animate-spin mr-2" /> : <Smartphone size={18} className="mr-2" />}
                      Salvar Configurações
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        const { data, error } = await supabase.functions.invoke('scheduled-reminders');
                        if (error) toast.error("Erro ao processar lembretes: " + error.message);
                        else toast.success(`Processado: ${data.processed} lembretes enviados.`);
                      }} 
                      className="border-bronze text-bronze hover:bg-bronze/10 h-12 rounded-xl"
                    >
                      Disparar Lembretes (Manual)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SECTION: CONHECIMENTO */}
          {activeSection === "knowledge" && isAdmin && (
            <div className="animate-fade-in max-w-5xl space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-serif text-navy">Base de Conhecimento</h3>
                  <p className="text-sm text-muted-foreground">Adicione informações que o agente usará como fonte da verdade.</p>
                </div>
                <Button onClick={addKnowledge} className="bg-bronze hover:bg-bronze-glow text-accent-foreground">
                  + Adicionar Tópico
                </Button>
              </div>

              <div className="grid gap-6">
                {knowledge.map((item, idx) => (
                  <Card key={item.id} className="border-border/50 shadow-card bg-card/50 backdrop-blur-sm overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Título do Assunto</Label>
                              <Input 
                                value={item.title} 
                                onChange={(e) => {
                                  const newK = [...knowledge];
                                  newK[idx].title = e.target.value;
                                  setKnowledge(newK);
                                }}
                                className="bg-background border-border"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Categoria</Label>
                              <Input 
                                value={item.category} 
                                onChange={(e) => {
                                  const newK = [...knowledge];
                                  newK[idx].category = e.target.value;
                                  setKnowledge(newK);
                                }}
                                className="bg-background border-border"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Conteúdo Detalhado</Label>
                            <Textarea 
                              value={item.content} 
                              rows={4}
                              onChange={(e) => {
                                const newK = [...knowledge];
                                newK[idx].content = e.target.value;
                                setKnowledge(newK);
                              }}
                              className="bg-background border-border resize-none"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={item.is_active} 
                                onCheckedChange={(v) => {
                                  const newK = [...knowledge];
                                  newK[idx].is_active = v;
                                  setKnowledge(newK);
                                  saveKnowledgeItem(newK[idx]);
                                }}
                              />
                              <span className="text-xs font-medium text-muted-foreground">Tópico Ativo</span>
                            </div>
                            <div className="flex gap-3">
                              <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteKnowledge(item.id)}>Excluir</Button>
                              <Button variant="secondary" size="sm" onClick={() => saveKnowledgeItem(item)}>Salvar Alterações</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {knowledge.length === 0 && (
                  <div className="p-20 text-center border-2 border-dashed border-border/50 rounded-3xl text-muted-foreground">
                    <Bot size={48} className="mx-auto opacity-20 mb-4" />
                    <p>Sua base de conhecimento está vazia.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION: USERS */}
          {activeSection === "users" && isAdmin && (
            <div className="animate-fade-in max-w-4xl">
              <Card className="border-border/50 shadow-card rounded-2xl bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {users.map((u) => (
                      <div key={u.id} className="p-6 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-charcoal to-navy flex items-center justify-center text-white font-serif text-xl shadow-md">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{u.email}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-1 opacity-70">ID: {u.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs font-bold tracking-wider uppercase px-3 py-1.5 rounded-md ${
                            u.role === 'admin' 
                            ? 'bg-charcoal text-white shadow-sm' 
                            : 'bg-muted border border-border text-muted-foreground'
                          }`}>
                            {u.role === "admin" ? "Administrador" : "Atendente"}
                          </span>
                          <Button 
                            variant={u.role === "admin" ? "outline" : "default"} 
                            size="sm" 
                            onClick={() => toggleUserRole(u.id, u.role)}
                            className="min-w-[150px] rounded-lg"
                          >
                            {u.role === "admin" ? "Remover Privilégios" : "Promover a Admin"}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && (
                      <div className="p-16 text-center text-muted-foreground">
                        <Users size={48} className="mx-auto opacity-20 mb-4" />
                        <p className="text-lg">Nenhum outro usuário cadastrado no sistema.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Admin;
