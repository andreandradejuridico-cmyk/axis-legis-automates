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

    const [bhRes, appRes, knowledgeRes, historyRes] = await Promise.all([
      supabase.from("business_hours").select("*"),
      supabase
        .from("appointments")
        .select("appointment_time")
        .gte("appointment_time", new Date().toISOString()),
      supabase.from("agent_knowledge").select("title, content").eq("is_active", true),
      supabase
        .from("chat_messages")
        .select("role, content")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const bh = bhRes.data || [];
    const apps = appRes.data || [];
    const knowledge = knowledgeRes.data || [];
    const history = (historyRes.data || []).reverse();

    // 4. Construct System Prompt - Balanced Architecture
    const systemPrompt = `
# PERSONALIDADE E ORIENTAÇÕES
${cfg.system_prompt || "Você é o assistente sofisticado da Axis Legis."}

# REGRAS SAGRADAS (MANUAL TÉCNICO)
${cfg.rules_prompt || "Peça os dados um por um."}

# CONTEXTO ATUAL (SISTEMA)
- Data/Hora: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
- Horários de atendimento: ${JSON.stringify(bh)}
- Horários ocupados: ${JSON.stringify(apps)}
- Conhecimento Adicional: ${knowledge.map((k) => `## ${k.title}\n${k.content}`).join("\n\n")}
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "system", content: `REGRA DE OURO (MANDATÓRIO):
1. NUNCA peça mais de uma informação por vez. Se precisar de Nome, Telefone e Email, peça PRIMEIRO o Nome e aguarde.
2. NUNCA faça cálculos de fuso horário. Use o horário que o usuário fornecer exatamente como ele falar.
3. Se usar botões, NÃO descreva as opções no texto.
4. Seja breve e sofisticado.` }
    ];

    // 5. Tools Schema
    const tools = [
      {
        type: "function",
        function: {
          name: "create_appointment",
          description:
            "Reserva um horário na agenda. Exige todos os dados confirmados pelo usuário.",
          parameters: {
            type: "object",
            properties: {
              contact_name: { type: "string" },
              contact_phone: { type: "string" },
              contact_email: { type: "string", description: "E-mail do contato" },
              appointment_time: { type: "string", description: "ISO 8601" },
              legal_area: { type: "string" },
              subject: { type: "string" },
            },
            required: [
              "contact_name",
              "contact_phone",
              "contact_email",
              "appointment_time",
              "legal_area",
              "subject",
            ],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "suggest_quick_replies",
          description:
            "Sugere de 2 a 4 opções de resposta rápida para o usuário escolher. Use quando ajudar a guiar a conversa.",
          parameters: {
            type: "object",
            properties: {
              replies: {
                type: "array",
                items: { type: "string" },
                minItems: 2,
                maxItems: 4,
              },
            },
            required: ["replies"],
          },
        },
      },
    ];

    // 6. Map Model Name for Gateway Compatibility
    let modelName = cfg?.model || "google/gemini-2.5-flash";
    if (!modelName.includes("/")) {
      if (modelName.includes("gemini")) modelName = `google/${modelName}`;
      else if (modelName.includes("gpt")) modelName = `openai/${modelName}`;
    }
    if (modelName.includes("gpt-4")) modelName = "openai/gpt-4o";

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
        messages,
        tools,
        tool_choice: "auto",
        temperature: Number(cfg?.temperature ?? 0.7),
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Gateway Error Detail:", errText);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({
            reply: "Muitas solicitações no momento. Tente novamente em instantes.",
            conversationId: conv.id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({
            reply: "O serviço de IA está temporariamente indisponível. Por favor, contate o administrador.",
            conversationId: conv.id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          reply: "Estou ajustando minha sintonia com o servidor. Tente novamente em instantes.",
          conversationId: conv.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiRes.json();
    const aiMsg = aiJson.choices?.[0]?.message;
    let reply = aiMsg?.content || "";
    let quickReplies: string[] = [];

    // 8. Handle Tool Execution
    if (aiMsg?.tool_calls) {
      for (const call of aiMsg.tool_calls) {
        const fnName = call.function?.name;
        let args: any = {};
        try {
          args = JSON.parse(call.function?.arguments || "{}");
        } catch (_) {
          args = {};
        }

        if (fnName === "create_appointment") {
          // Forçamos o fuso horário de Brasília (UTC-3) se nenhum fuso for fornecido,
          // ou substituímos 'Z' por '-03:00' para garantir que o horário local seja mantido no banco.
          if (args.appointment_time) {
            args.appointment_time = args.appointment_time.replace(/Z$/, "-03:00");
            if (!args.appointment_time.includes("-0") && !args.appointment_time.includes("+")) {
              args.appointment_time += "-03:00";
            }
          }

          const missing: string[] = [];
          for (const k of [
            "contact_name",
            "contact_phone",
            "contact_email",
            "appointment_time",
            "legal_area",
            "subject",
          ]) {
            if (!args[k]) missing.push(k);
          }

          if (missing.length > 0) {
            reply =
              reply ||
              `Para concluir o agendamento, preciso ainda de: ${missing.join(", ")}. Pode me informar?`;
            continue;
          }

          const { error: insErr } = await supabase.from("appointments").insert({
            contact_name: args.contact_name,
            contact_phone: args.contact_phone,
            contact_email: args.contact_email,
            appointment_time: args.appointment_time,
            legal_area: args.legal_area,
            subject: args.subject,
            status: "pending",
          });

          if (!insErr) {
            const displayTime = args.appointment_time.split('T')[1]?.substring(0, 5) || args.appointment_time;
            const displayDate = new Date(args.appointment_time).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            // SOBRESCREVEMOS a resposta da IA para garantir que o horário exibido seja o real do banco
            reply = `Perfeito, ${args.contact_name}! Seu agendamento para o dia ${displayDate} às ${displayTime} foi registrado com sucesso. Em breve nossa equipe confirmará.`;
          } else {
            console.error("Insert Error:", insErr);
            reply = "Tive um problema técnico ao registrar o agendamento. Pode tentar novamente em alguns instantes?";
          }
        }

        if (fnName === "suggest_quick_replies" && Array.isArray(args.replies)) {
          quickReplies = args.replies.slice(0, 4).map((r: any) => String(r));
        }
      }
    }

    if (!reply) {
      reply = "Como posso ajudar você hoje na Axis Legis?";
    }

    // 9. Save and Return
    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "assistant",
      content: reply,
      metadata: quickReplies.length ? { quickReplies } : {},
    });

    return new Response(
      JSON.stringify({ reply, quickReplies, conversationId: conv.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Function Error:", e);
    return new Response(
      JSON.stringify({
        error: String(e),
        reply: "Desculpe, tive um problema ao processar sua solicitação. Por favor, tente novamente.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
