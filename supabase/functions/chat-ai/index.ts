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
    const systemPrompt = `
      ${cfg?.system_prompt || "Você é o assistente sofisticado da Axis Legis."}
      
      # CONTEXTO
      - Data/Hora: ${new Date().toLocaleString('pt-BR')}
      - Horários: ${JSON.stringify(bh)}
      - Agenda: ${JSON.stringify(apps)}
      
      # CONHECIMENTO
      ${knowledge.map(k => `## ${k.title}\n${k.content}`).join('\n\n')}
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content }))
    ];

    // 5. Tools Schema
    const tools = [
      {
        type: "function",
        function: {
          name: "create_appointment",
          description: "Reserva um horário na agenda.",
          parameters: {
            type: "object",
            properties: {
              contact_name: { type: "string" },
              contact_phone: { type: "string" },
              appointment_time: { type: "string", description: "ISO 8601" },
              legal_area: { type: "string" },
              subject: { type: "string" }
            },
            required: ["contact_name", "contact_phone", "appointment_time"]
          }
        }
      }
    ];

    // 6. Map Model Name for 2026 Gateway Compatibility
    let modelName = cfg?.model || "google/gemini-2.5-flash";
    if (!modelName.includes("/")) {
      if (modelName.includes("gemini")) modelName = `google/${modelName}`;
      else if (modelName.includes("gpt")) modelName = `openai/${modelName}`;
    }
    // Map legacy GPT-4 to GPT-5
    if (modelName.includes("gpt-4")) modelName = "openai/gpt-5-mini";

    console.log("Calling AI Gateway with model:", modelName);

    // 7. Request to AI Gateway
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        tools: tools,
        tool_choice: "auto",
        temperature: Number(cfg?.temperature ?? 0.7),
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Gateway Error Detail:", errText);
      return new Response(JSON.stringify({ 
        reply: "Estou ajustando minha sintonia com o servidor. Por favor, tente novamente em 10 segundos.",
        conversationId: conv.id 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiRes.json();
    const aiMsg = aiJson.choices?.[0]?.message;
    let reply = aiMsg?.content || "";

    // 8. Handle Tool Execution
    if (aiMsg?.tool_calls) {
      for (const call of aiMsg.tool_calls) {
        if (call.function.name === "create_appointment") {
          const args = JSON.parse(call.function.arguments);
          const { error: insErr } = await supabase.from("appointments").insert({
            contact_name: args.contact_name,
            contact_phone: args.contact_phone,
            appointment_time: args.appointment_time,
            legal_area: args.legal_area || "Geral",
            subject: args.subject || "Reunião Inicial",
            contact_email: "cliente@axislegis.com.br",
            status: "pending"
          });
          
          if (!insErr) {
            reply = reply || `Perfeito, ${args.contact_name}! Seu agendamento para ${new Date(args.appointment_time).toLocaleString('pt-BR')} foi registrado.`;
          } else {
            console.error("Insert Error:", insErr);
          }
        }
      }
    }

    if (!reply && !aiMsg?.tool_calls) {
      reply = "Como posso ajudar você hoje na Axis Legis?";
    }

    // 9. Save and Return
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

