import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, LogOut, MessageSquare, Bot, Smartphone, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AgentCfg = {
  id: string;
  agent_name: string;
  model: string;
  system_prompt: string;
  welcome_message: string;
  temperature: number;
  enabled: boolean;
};

type WaCfg = {
  id: string;
  instance_name: string | null;
  default_number: string | null;
  connected: boolean;
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

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agent, setAgent] = useState<AgentCfg | null>(null);
  const [wa, setWa] = useState<WaCfg | null>(null);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conv | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    
    // Check if user is admin
    const { data: sessionRes } = await supabase.auth.getSession();
    const user = sessionRes.session?.user;
    let adminCheck = false;
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      adminCheck = !!roleData;
      setIsAdmin(adminCheck);
      
      if (adminCheck) {
        const { data: usersData } = await supabase.rpc('get_all_users');
        if (usersData) setUsers(usersData);
      }
    }

    const [a, w, c] = await Promise.all([
      adminCheck ? supabase.from("ai_agent_config").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
      adminCheck ? supabase.from("whatsapp_settings").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("chat_conversations").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setAgent(a.data as any);
    setWa(w.data as any);
    setConversations((c.data as any) ?? []);
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
        welcome_message: agent.welcome_message,
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

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-navy-gradient text-primary-foreground">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <p className="text-bronze-light text-xs tracking-[0.3em] uppercase">Axis Legis</p>
            <h1 className="font-serif text-2xl">Painel Administrativo</h1>
          </div>
          <Button variant="hero-outline" onClick={logout}>
            <LogOut size={16} className="mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-6xl">
        <Tabs defaultValue="conversations" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="conversations" className="flex gap-2">
              <MessageSquare size={16} /> Conversas
            </TabsTrigger>
            {isAdmin && agent && (
              <TabsTrigger value="agent" className="flex gap-2">
                <Bot size={16} /> Agente de IA
              </TabsTrigger>
            )}
            {isAdmin && wa && (
              <TabsTrigger value="whatsapp" className="flex gap-2">
                <Smartphone size={16} /> WhatsApp
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="users" className="flex gap-2">
                <Users size={16} /> Permissões
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="conversations" className="focus-visible:outline-none">
            <Card className="border-bronze/10 shadow-sm">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2 font-serif text-xl">
                  <MessageSquare size={20} className="text-bronze" /> Conversas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>Nenhuma conversa registrada ainda.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {conversations.map((c) => (
                      <div key={c.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{c.contact_name || c.contact_phone || c.session_id}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Canal: <span className="uppercase font-mono text-[10px]">{c.channel}</span> · {new Date(c.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => viewHistory(c)}>
                          Ver Histórico
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <Dialog open={!!selectedConv} onOpenChange={(o) => !o && setSelectedConv(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Histórico de Conversa</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-md bg-muted/10">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-bronze" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Nenhuma mensagem encontrada nesta conversa.</p>
                ) : (
                  chatMessages.map(msg => (
                    <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 px-1">
                        {msg.role === 'user' ? 'Cliente' : 'Agente IA'}
                      </span>
                      <div className={`p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-bronze text-accent-foreground' : 'bg-primary-foreground/10 text-primary-foreground'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {isAdmin && agent && (
            <TabsContent value="agent" className="focus-visible:outline-none">
              <Card className="border-bronze/10 shadow-sm">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="flex items-center justify-between font-serif text-xl">
                    <div className="flex items-center gap-2">
                      <Bot size={20} className="text-bronze" /> Configuração do Agente IA
                    </div>
                    <div className="flex items-center gap-3 text-sm font-sans font-normal">
                      <Label htmlFor="agent-active" className="cursor-pointer">Ativo no site</Label>
                      <Switch
                        id="agent-active"
                        checked={agent.enabled}
                        onCheckedChange={(v) => setAgent({ ...agent, enabled: v })}
                      />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid gap-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Nome do Agente</Label>
                      <Input
                        value={agent.agent_name}
                        onChange={(e) => setAgent({ ...agent, agent_name: e.target.value })}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Modelo de IA</Label>
                      <Input
                        value={agent.model}
                        onChange={(e) => setAgent({ ...agent, model: e.target.value })}
                        placeholder="google/gemini-2.5-flash"
                        className="bg-background font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem de Boas-vindas</Label>
                    <Textarea
                      value={agent.welcome_message}
                      onChange={(e) => setAgent({ ...agent, welcome_message: e.target.value })}
                      rows={2}
                      className="resize-none bg-background"
                    />
                    <p className="text-xs text-muted-foreground">A primeira mensagem enviada pelo bot ao iniciar um novo atendimento.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Prompt do Sistema (Comportamento)</Label>
                    <Textarea
                      value={agent.system_prompt}
                      onChange={(e) => setAgent({ ...agent, system_prompt: e.target.value })}
                      rows={8}
                      className="bg-background font-mono text-sm leading-relaxed"
                    />
                  </div>
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <Label>Temperatura (Criatividade)</Label>
                      <span className="text-sm font-mono font-medium text-bronze bg-bronze/10 px-2 py-0.5 rounded">
                        {agent.temperature.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[agent.temperature]}
                      min={0}
                      max={2}
                      step={0.1}
                      onValueChange={([v]) => setAgent({ ...agent, temperature: v })}
                      className="py-4"
                    />
                    <p className="text-xs text-muted-foreground flex justify-between">
                      <span>Mais conservador (0.0)</span>
                      <span>Mais criativo (2.0)</span>
                    </p>
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <Button onClick={saveAgent} disabled={saving} variant="hero" className="w-full sm:w-auto">
                      {saving ? <Loader2 className="animate-spin mr-2" /> : <Bot size={16} className="mr-2" />}
                      Salvar Configurações do Agente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && wa && (
            <TabsContent value="whatsapp" className="focus-visible:outline-none">
              <Card className="border-bronze/10 shadow-sm">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="flex items-center gap-2 font-serif text-xl">
                    <Smartphone size={20} className="text-bronze" /> WhatsApp (Evolution API)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid gap-6">
                  <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground">
                    <p>
                      <strong>Nota de Segurança:</strong> As credenciais principais (URL da Evolution API, API Key e Nome real da Instância) 
                      são configuradas diretamente no servidor (Variáveis de Ambiente / Secrets) para evitar exposição no painel web.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Nome de Referência</Label>
                      <Input
                        value={wa.instance_name ?? ""}
                        onChange={(e) => setWa({ ...wa, instance_name: e.target.value })}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número Padrão (Fallback)</Label>
                      <Input
                        value={wa.default_number ?? ""}
                        onChange={(e) => setWa({ ...wa, default_number: e.target.value })}
                        placeholder="5511999999999"
                        className="bg-background"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-background border border-border p-4 rounded-lg">
                    <div>
                      <Label className="text-base">Status da Conexão</Label>
                      <p className="text-xs text-muted-foreground mt-1">Indica se o QR Code foi lido e a instância está operante.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium uppercase tracking-wide px-2 py-1 rounded-full ${wa.connected ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {wa.connected ? 'Conectado' : 'Desconectado'}
                      </span>
                      <Switch
                        checked={wa.connected}
                        onCheckedChange={(v) => setWa({ ...wa, connected: v })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook Configurado na Evolution</Label>
                    <div className="bg-muted p-3 rounded-md text-xs font-mono break-all border border-border/50">
                      {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <Button onClick={saveWa} disabled={saving} variant="hero" className="w-full sm:w-auto">
                      {saving ? <Loader2 className="animate-spin mr-2" /> : <Smartphone size={16} className="mr-2" />}
                      Salvar Configurações do WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="users" className="focus-visible:outline-none">
              <Card className="border-bronze/10 shadow-sm">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="flex items-center gap-2 font-serif text-xl">
                    <Users size={20} className="text-bronze" /> Gestão de Acessos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {users.map((u) => (
                      <div key={u.id} className="p-4 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-foreground">{u.email}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">ID: {u.id}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-mono px-3 py-1 rounded-full ${u.role === 'admin' ? 'bg-bronze/10 text-bronze border border-bronze/20' : 'bg-muted text-muted-foreground'}`}>
                            {u.role === "admin" ? "Administrador" : "Atendente"}
                          </span>
                          <Button 
                            variant={u.role === "admin" ? "outline" : "default"} 
                            size="sm" 
                            onClick={() => toggleUserRole(u.id, u.role)}
                            className="min-w-[140px]"
                          >
                            {u.role === "admin" ? "Remover Admin" : "Tornar Admin"}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        <p>Nenhum usuário encontrado além de você.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
