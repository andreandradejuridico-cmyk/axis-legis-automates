import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<"loading" | "ok" | "deny">("loading");
  const location = useLocation();

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const user = sessionRes.session?.user;
      if (!user) {
        if (active) setState("deny");
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!active) return;
      setState(data ? "ok" : "deny");
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary text-primary-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (state === "deny") {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default AdminGuard;
