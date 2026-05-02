import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, message, contact } = await req.json();
    if (!sessionId || !message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "sessionId and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get or create conversation
    let { data: conv } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (!conv) {
      const { data: newConv, error } = await supabase
        .from("chat_conversations")
        .insert({
          session_id: sessionId,
          channel: "web",
          contact_name: contact?.name ?? null,
          contact_email: contact?.email ?? null,
          contact_phone: contact?.phone ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      conv = newConv;
    }

    // Save user message
    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "user",
      content: message,
    });

    // Load AI config
    const { data: cfg } = await supabase
      .from("ai_agent_config")
      .select("*")
      .eq("enabled", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg) {
      return new Response(
        JSON.stringify({ reply: "Atendimento indisponível no momento.", conversationId: conv.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load history
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(40);

    const messages = [
      { role: "system", content: cfg.system_prompt },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
    ];

    // Call Lovable AI Gateway
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: Number(cfg.temperature ?? 0.6),
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas mensagens. Tente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiJson = await aiRes.json();
    const reply: string = aiJson.choices?.[0]?.message?.content ?? "Desculpe, não consegui responder.";

    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "assistant",
      content: reply,
    });

    return new Response(JSON.stringify({ reply, conversationId: conv.id }), {
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
