import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/admin", { replace: true });
    });
  }, [navigate]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Cadastro realizado! Você já pode entrar.");
      setIsSignUp(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      navigate("/admin", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-gradient px-6">
      <form
        onSubmit={handle}
        className="w-full max-w-md bg-primary/60 backdrop-blur border border-bronze/20 rounded-xl p-8 space-y-5 shadow-premium"
      >
        <div className="text-center mb-2">
          <p className="text-bronze-light text-xs tracking-[0.3em] uppercase mb-2">Axis Legis</p>
          <h1 className="text-2xl font-serif text-primary-foreground">
            {isSignUp ? "Criar Acesso" : "Painel Administrativo"}
          </h1>
        </div>
        <div className="space-y-2">
          <Label className="text-primary-foreground/70 text-xs uppercase tracking-wide">E-mail</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-primary-foreground/5 border-bronze/20 text-primary-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-primary-foreground/70 text-xs uppercase tracking-wide">Senha</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-primary-foreground/5 border-bronze/20 text-primary-foreground"
          />
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : isSignUp ? "Cadastrar" : "Entrar"}
        </Button>
        <div className="flex flex-col gap-2 pt-2">
          <Button 
            type="button" 
            variant="link" 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary-foreground/60 text-xs hover:text-primary-foreground"
          >
            {isSignUp ? "Já tenho uma conta. Fazer login." : "Não tem senha? Criar acesso inicial."}
          </Button>
          <p className="text-primary-foreground/40 text-[10px] text-center">
            Acesso restrito. Cadastros estão liberados temporariamente para configuração.
          </p>
        </div>
      </form>
    </div>
  );
};

export default AdminLogin;
