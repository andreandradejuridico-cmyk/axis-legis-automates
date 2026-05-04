import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, message, contact } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get conversation
    let { data: conv } = await supabase.from("chat_conversations").select("*").eq("session_id", sessionId).maybeSingle();
    if (!conv) {
      const { data: newConv } = await supabase.from("chat_conversations").insert({ session_id: sessionId, channel: "web" }).select().single();
      conv = newConv;
    }

    // Save user message
    await supabase.from("chat_messages").insert({ conversation_id: conv.id, role: "user", content: message });

    // Load AI config
    const { data: cfg } = await supabase.from("ai_agent_config").select("*").eq("enabled", true).limit(1).maybeSingle();
    const { data: bh } = await supabase.from("business_hours").select("*");
    const { data: apps } = await supabase.from("appointments").select("appointment_time").gte("appointment_time", new Date().toISOString());

    const systemPrompt = `
      ${cfg?.system_prompt || "Você é o assistente da Axis Legis."}
      
      # REGRAS DE OURO
      - Responda apenas uma pergunta por vez (Fragmentação).
      - Hoje é ${new Date().toLocaleDateString('pt-BR')}.
      - Use os dados de agendamento se necessário: ${JSON.stringify(apps)}
      - Horários: ${JSON.stringify(bh)}
    `;

    // AI Request
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg?.model || "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
      }),
    });

    const aiJson = await aiRes.json();
    const reply = aiJson.choices?.[0]?.message?.content || "Desculpe, tive um problema ao processar sua mensagem.";

    // Save assistant message
    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "assistant",
      content: reply,
    });

    return new Response(JSON.stringify({ reply, conversationId: conv.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
