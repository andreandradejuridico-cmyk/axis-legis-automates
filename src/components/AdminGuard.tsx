import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<"loading" | "ok" | "deny">("loading");
  const location = useLocation();

  useEffect(() => {
    let active = true;

    const verify = async (userId: string | undefined) => {
      if (!userId) {
        if (active) setState("deny");
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!active) return;
      if (error) console.error("AdminGuard role check failed:", error);
      setState(data ? "ok" : "deny");
    };

    // Set up listener FIRST. Defer supabase calls with setTimeout to avoid deadlock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => verify(session?.user?.id), 0);
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data }) => {
      verify(data.session?.user?.id);
    });

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
