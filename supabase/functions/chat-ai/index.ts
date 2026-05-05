import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, message } = await req.json();

    if (!message || !sessionId) {
      return new Response(JSON.stringify({ error: "sessionId and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Get or Create Conversation
    let { data: conv } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (!conv) {
      const { data: newConv, error: convErr } = await supabase
        .from("chat_conversations")
        .insert({ session_id: sessionId, channel: "web" })
        .select()
        .single();
      if (convErr) throw convErr;
      conv = newConv;
    }

    // 2. Save user message
    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "user",
      content: message,
    });

    // 3. Load Context Data
    const { data: cfg } = await supabase
      .from("ai_agent_config")
      .select("system_prompt, rules_prompt, temperature, model, enabled")
      .eq("enabled", true)
      .maybeSingle();

    if (!cfg) return new Response(JSON.stringify({ reply: "Agente desativado." }), { status: 200 });

    const [bhRes, knowledgeRes, historyRes] = await Promise.all([
      supabase.from("business_hours").select("*"),
      supabase.from("agent_knowledge").select("title, content").eq("is_active", true),
      supabase
        .from("chat_messages")
        .select("role, content")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const bh = bhRes.data || [];
    const knowledge = knowledgeRes.data || [];
    const history = (historyRes.data || []).reverse();

    // 4. Construct System Prompt - PURE FROM ADMIN
    // Aqui não injetamos nenhuma regra extra, apenas o que vem do seu painel.
    const systemPrompt = `
${cfg.system_prompt || "Você é o assistente da Axis Legis."}

# CONTEXTO TÉCNICO
- Horário Atual: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
- Horários da Empresa: ${JSON.stringify(bh)}
- Base de Conhecimento: ${knowledge.map((k) => k.content).join(" ")}

# SACRED RULES (SOVEREIGN BEHAVIOR)
${cfg.rules_prompt || ""}
- One question at a time: NEVER ask multiple questions in one reply.
- No Lists: Prefer narrative flow over bullet points unless explicitly requested.
- Timezone Sovereignty: Always assume America/Sao_Paulo. Never mention UTC/Z to the user.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      { 
        role: "user", 
        content: history[history.length - 1]?.content || message
      }
    ];

    // 5. Tools Schema
    const tools = [
      {
        type: "function",
        function: {
          name: "create_appointment",
          description: "Registra um agendamento no sistema.",
          parameters: {
            type: "object",
            properties: {
              contact_name: { type: "string" },
              contact_phone: { type: "string" },
              contact_email: { type: "string" },
              appointment_time: { type: "string", description: "Formato: YYYY-MM-DD HH:mm:ss (Horário de Brasília)" },
              legal_area: { type: "string" },
              subject: { type: "string" },
            },
            required: ["contact_name", "contact_phone", "contact_email", "appointment_time", "legal_area", "subject"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_available_slots",
          description: "Consulta horários disponíveis para uma data específica.",
          parameters: {
            type: "object",
            properties: {
              date: { type: "string", description: "Formato: YYYY-MM-DD" },
            },
            required: ["date"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "suggest_quick_replies",
          description: "Exibe botões de resposta rápida.",
          parameters: {
            type: "object",
            properties: {
              replies: { type: "array", items: { type: "string" } },
            },
            required: ["replies"],
          },
        },
      },
    ];

    // 6. Request to AI Gateway
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg?.model || "google/gemini-2.0-flash",
        messages,
        tools,
        tool_choice: "auto",
        temperature: Number(cfg?.temperature ?? 0.7),
      }),
    });

    if (!aiRes.ok) throw new Error("AI Gateway failure");

    const aiJson = await aiRes.json();
    const aiMsg = aiJson.choices?.[0]?.message;
    let reply = aiMsg?.content || "";
    let quickReplies: string[] = [];

    // 7. Handle Tool Execution
    if (aiMsg?.tool_calls) {
      for (const call of aiMsg.tool_calls) {
        const fnName = call.function?.name;
        const args = JSON.parse(call.function?.arguments || "{}");

        if (fnName === "get_available_slots") {
          const date = args.date; // YYYY-MM-DD
          const dayOfWeek = new Date(date + "T12:00:00").getDay();
          
          const { data: businessHours } = await supabase
            .from("business_hours")
            .select("*")
            .eq("day_of_week", dayOfWeek)
            .maybeSingle();

          if (!businessHours || businessHours.is_closed) {
             reply = "Desculpe, não atendemos nesta data.";
          } else {
             // Buscar agendamentos do dia
             const { data: existing } = await supabase
               .from("appointments")
               .select("appointment_time")
               .gte("appointment_time", `${date} 00:00:00-03`)
               .lte("appointment_time", `${date} 23:59:59-03`);

             const booked = (existing || []).map(a => new Date(a.appointment_time).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }));
             
             // Gerar slots de 1h
             const slots = [];
             let current = businessHours.start_time.substring(0, 5);
             const end = businessHours.end_time.substring(0, 5);
             
             while (current < end) {
               if (!booked.includes(current)) slots.push(current);
               const [h, m] = current.split(":").map(Number);
               const next = new Date(2000, 0, 1, h + 1, m);
               current = next.toTimeString().substring(0, 5);
             }
             
             reply = `Para o dia ${new Date(date + "T12:00:00").toLocaleDateString("pt-BR")}, temos os seguintes horários: ${slots.join(", ")}. Qual prefere?`;
          }
        }

        if (fnName === "create_appointment") {
          // Garantir fuso de Brasília na string pura
          let finalTime = args.appointment_time;
          if (!finalTime.includes("-") && !finalTime.includes("+")) {
             finalTime = finalTime.replace("T", " ") + "-03:00";
          }

          const { error: insErr } = await supabase.from("appointments").insert({
            contact_name: args.contact_name,
            contact_phone: args.contact_phone,
            contact_email: args.contact_email,
            appointment_time: finalTime,
            legal_area: args.legal_area,
            subject: args.subject,
            status: "pending",
          });

          if (!insErr) {
            const displayTime = finalTime.split(' ')[1]?.substring(0, 5) || finalTime.split('T')[1]?.substring(0, 5);
            reply = reply || `Perfeito! Agendamento solicitado para às ${displayTime}. Posso ajudar em algo mais?`;
          }
        }

        if (fnName === "suggest_quick_replies" && Array.isArray(args.replies)) {
          quickReplies = args.replies;
        }
      }
    }

    if (!reply) reply = "Como posso ajudar?";

    // 8. Save and Return
    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "assistant",
      content: reply,
      metadata: quickReplies.length ? { quickReplies } : {},
    });

    return new Response(JSON.stringify({ reply, quickReplies, conversationId: conv.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e), reply: "Erro técnico. Tente novamente." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
