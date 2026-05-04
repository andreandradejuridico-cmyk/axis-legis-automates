import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, message } = await req.json();
    
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Get or Create Conversation
    let { data: conv } = await supabase.from("chat_conversations").select("*").eq("session_id", sessionId).maybeSingle();
    if (!conv) {
      const { data: newConv, error: convErr } = await supabase.from("chat_conversations").insert({ session_id: sessionId, channel: "web" }).select().single();
      if (convErr) throw convErr;
      conv = newConv;
    }

    // 2. Save user message
    await supabase.from("chat_messages").insert({ conversation_id: conv.id, role: "user", content: message });

    // 3. Load Context Data (Parallel)
    const [cfgRes, bhRes, appRes, knowledgeRes, historyRes] = await Promise.all([
      supabase.from("ai_agent_config").select("*").eq("enabled", true).limit(1).maybeSingle(),
      supabase.from("business_hours").select("*"),
      supabase.from("appointments").select("appointment_time").gte("appointment_time", new Date().toISOString()),
      supabase.from("agent_knowledge").select("title, content").eq("is_active", true),
      supabase.from("chat_messages").select("role, content").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(10)
    ]);

    const cfg = cfgRes.data;
    const bh = bhRes.data || [];
    const apps = appRes.data || [];
    const knowledge = knowledgeRes.data || [];
    const history = (historyRes.data || []).reverse();

    // 4. Construct System Prompt
    // We keep it clean and focused on what's in the Admin panel, adding only essential dynamic data.
    const systemPrompt = `
      ${cfg?.system_prompt || "Você é o assistente da Axis Legis."}
      
      # INFORMAÇÕES DO SISTEMA (Contexto em Tempo Real)
      - Data Atual: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
      - Horários de Funcionamento: ${JSON.stringify(bh)}
      - Agendamentos Existentes: ${JSON.stringify(apps)}
      
      # BASE DE CONHECIMENTO
      ${knowledge.map(k => `## ${k.title}\n${k.content}`).join('\n\n')}
    `;

    // 5. Prepare Messages for AI
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content }))
    ];

    // 6. Call AI Gateway
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg?.model || "gpt-4o",
        messages: messages,
        temperature: Number(cfg?.temperature ?? 0.7),
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI Gateway Error:", errText);
      throw new Error(`AI Gateway responded with status ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    const reply = aiJson.choices?.[0]?.message?.content;

    if (!reply) {
      console.error("AI returned empty content:", aiJson);
      throw new Error("AI returned empty response");
    }

    // 7. Save assistant message
    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "assistant",
      content: reply,
    });

    return new Response(JSON.stringify({ reply, conversationId: conv.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Function Error:", e);
    return new Response(JSON.stringify({ 
      error: String(e),
      reply: "Desculpe, tive um problema ao processar sua solicitação. Por favor, tente novamente." 
    }), {
      status: 200, // Return 200 so the frontend can show the error message gracefully
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

