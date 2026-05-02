import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Public webhook called by Evolution API. Persists incoming messages and
// optionally replies via AI gateway then sends back through Evolution.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    console.log("Evolution webhook event", JSON.stringify(payload).slice(0, 800));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Evolution API typical event: { event: "messages.upsert", data: { key: { remoteJid }, message: { conversation } } }
    const data = payload?.data ?? payload;
    const remoteJid: string | undefined = data?.key?.remoteJid;
    const fromMe: boolean = !!data?.key?.fromMe;
    const text: string | undefined =
      data?.message?.conversation ??
      data?.message?.extendedTextMessage?.text ??
      data?.message?.text;

    if (!remoteJid || fromMe || !text) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionId = `wa:${remoteJid}`;

    let { data: conv } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await supabase
        .from("chat_conversations")
        .insert({ session_id: sessionId, channel: "whatsapp", contact_phone: remoteJid })
        .select()
        .single();
      conv = newConv;
    }

    await supabase.from("chat_messages").insert({
      conversation_id: conv!.id,
      role: "user",
      content: text,
      metadata: { remoteJid },
    });

    // AI reply
    const { data: cfg } = await supabase
      .from("ai_agent_config")
      .select("*")
      .eq("enabled", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conv!.id)
      .order("created_at", { ascending: true })
      .limit(40);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: Number(cfg.temperature ?? 0.6),
        messages: [
          { role: "system", content: cfg.system_prompt },
          ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!aiRes.ok) {
      console.error("AI error", aiRes.status, await aiRes.text());
      return new Response(JSON.stringify({ ok: true, ai_error: aiRes.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const reply: string = aiJson.choices?.[0]?.message?.content ?? "";

    if (reply) {
      await supabase.from("chat_messages").insert({
        conversation_id: conv!.id,
        role: "assistant",
        content: reply,
      });

      const baseUrl = Deno.env.get("EVOLUTION_API_URL")!.replace(/\/$/, "");
      const apiKey = Deno.env.get("EVOLUTION_API_KEY")!;
      const instance = Deno.env.get("EVOLUTION_INSTANCE_NAME")!;
      await fetch(`${baseUrl}/message/sendText/${instance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ number: remoteJid, text: reply }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
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
