import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // 1. Get WhatsApp Settings
    const { data: wa } = await supabase.from("whatsapp_settings").select("*").limit(1).maybeSingle();
    if (!wa || !wa.api_url || !wa.api_key || !wa.instance_name || !wa.connected) {
      return new Response(JSON.stringify({ message: "WhatsApp not configured or disabled" }));
    }

    const now = new Date();
    
    // --- 24h REMINDERS (Between 23.5 and 24.5 hours from now) ---
    const t24Start = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
    const t24End = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);
    
    const { data: apps24 } = await supabase
      .from("appointments")
      .select("*")
      .eq("reminder_24h_sent", false)
      .gte("appointment_time", t24Start.toISOString())
      .lte("appointment_time", t24End.toISOString());

    // --- 2h REMINDERS (Between 1.5 and 2.5 hours from now) ---
    const t2Start = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
    const t2End = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
    
    const { data: apps2 } = await supabase
      .from("appointments")
      .select("*")
      .eq("reminder_2h_sent", false)
      .gte("appointment_time", t2Start.toISOString())
      .lte("appointment_time", t2End.toISOString());

    const results = [];

    // Process 24h
    for (const app of (apps24 || [])) {
      const msg = `Olá ${app.contact_name}, aqui é da Axis Legis. Passando para confirmar nossa reunião de amanhã às ${new Date(app.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Até lá!`;
      const res = await sendWhatsApp(wa, app.contact_phone, msg);
      if (res.ok) {
        await supabase.from("appointments").update({ reminder_24h_sent: true }).eq("id", app.id);
        results.push(`24h sent to ${app.contact_name}`);
      }
    }

    // Process 2h
    for (const app of (apps2 || [])) {
      const msg = `Lembrete: Nossa reunião na Axis Legis começa em 2 horas (${new Date(app.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}). Nos vemos em breve!`;
      const res = await sendWhatsApp(wa, app.contact_phone, msg);
      if (res.ok) {
        await supabase.from("appointments").update({ reminder_2h_sent: true }).eq("id", app.id);
        results.push(`2h sent to ${app.contact_name}`);
      }
    }

    return new Response(JSON.stringify({ processed: results.length, details: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendWhatsApp(wa: any, number: string, text: string) {
  const baseUrl = wa.api_url.replace(/\/$/, "");
  // Ensure number is in correct format (remove special chars)
  const cleanNumber = number.replace(/\D/g, "");
  
  return fetch(`${baseUrl}/message/sendText/${wa.instance_name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: wa.api_key },
    body: JSON.stringify({ number: cleanNumber, text }),
  });
}
