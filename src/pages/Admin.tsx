import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, LogOut, MessageSquare, Bot, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agent, setAgent] = useState<AgentCfg | null>(null);
  const [wa, setWa] = useState<WaCfg | null>(null);
  const [conversations, setConversations] = useState<Conv[]>([]);

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
            <LogOut size={16} /> Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 grid gap-8 max-w-5xl">
        {agent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <Bot size={18} /> Agente de IA
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between">
                <Label>Ativo no site</Label>
                <Switch
                  checked={agent.enabled}
                  onCheckedChange={(v) => setAgent({ ...agent, enabled: v })}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome do agente</Label>
                  <Input
                    value={agent.agent_name}
                    onChange={(e) => setAgent({ ...agent, agent_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input
                    value={agent.model}
                    onChange={(e) => setAgent({ ...agent, model: e.target.value })}
                    placeholder="google/gemini-2.5-flash"
                  />
                </div>
              </div>
              <div>
                <Label>Mensagem de boas-vindas</Label>
                <Textarea
                  value={agent.welcome_message}
                  onChange={(e) => setAgent({ ...agent, welcome_message: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>Prompt do sistema</Label>
                <Textarea
                  value={agent.system_prompt}
                  onChange={(e) => setAgent({ ...agent, system_prompt: e.target.value })}
                  rows={8}
                />
              </div>
              <div>
                <Label>Temperatura ({agent.temperature})</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={2}
                  value={agent.temperature}
                  onChange={(e) => setAgent({ ...agent, temperature: parseFloat(e.target.value) })}
                />
              </div>
              <Button onClick={saveAgent} disabled={saving} variant="hero">
                {saving ? <Loader2 className="animate-spin" /> : "Salvar agente"}
              </Button>
            </CardContent>
          </Card>
        )}

        {wa && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <Smartphone size={18} /> WhatsApp (Evolution API)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                Credenciais (URL, API Key e Instance Name) são configuradas como segredos do servidor.
                Aqui você define apenas metadados e o estado.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome da instância (referência)</Label>
                  <Input
                    value={wa.instance_name ?? ""}
                    onChange={(e) => setWa({ ...wa, instance_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Número padrão</Label>
                  <Input
                    value={wa.default_number ?? ""}
                    onChange={(e) => setWa({ ...wa, default_number: e.target.value })}
                    placeholder="5511999999999"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Marcar como conectado</Label>
                <Switch
                  checked={wa.connected}
                  onCheckedChange={(v) => setWa({ ...wa, connected: v })}
                />
              </div>
              <div className="bg-muted p-3 rounded-md text-xs font-mono break-all">
                Webhook URL: {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`}
              </div>
              <Button onClick={saveWa} disabled={saving} variant="hero">
                {saving ? <Loader2 className="animate-spin" /> : "Salvar WhatsApp"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                Painel de Permissões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {users.map((u) => (
                  <div key={u.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{u.email}</p>
                      <p className="text-xs text-muted-foreground">ID: {u.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {u.role === "admin" ? "Admin" : "Atendente"}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toggleUserRole(u.id, u.role)}
                      >
                        {u.role === "admin" ? "Remover Admin" : "Tornar Admin"}
                      </Button>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <MessageSquare size={18} /> Conversas recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
            ) : (
              <div className="divide-y">
                {conversations.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.contact_name || c.contact_phone || c.session_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.channel} · {new Date(c.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
