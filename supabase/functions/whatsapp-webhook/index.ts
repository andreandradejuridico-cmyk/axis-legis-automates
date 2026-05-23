import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const modelLower = model.toLowerCase();
  let inputRate = 0.075; // USD per 1M tokens (Gemini Flash default)
  let outputRate = 0.30;
  
  if (modelLower.includes("gpt-4o-mini")) {
    inputRate = 0.15;
    outputRate = 0.60;
  } else if (modelLower.includes("gpt-4o")) {
    inputRate = 2.50;
    outputRate = 10.00;
  } else if (modelLower.includes("claude-3-5-sonnet") || modelLower.includes("claude-3.5-sonnet")) {
    inputRate = 3.00;
    outputRate = 15.00;
  } else if (modelLower.includes("gemini") && modelLower.includes("pro")) {
    inputRate = 1.25;
    outputRate = 5.00;
  }
  
  return (promptTokens * inputRate + completionTokens * outputRate) / 1000000;
}

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

    // 3. Load Context & Config (Sync with chat-ai)
    const [cfgRes, bhRes, knowledgeRes, historyRes] = await Promise.all([
      supabase.from("ai_agent_config").select("*").eq("enabled", true).maybeSingle(),
      supabase.from("business_hours").select("*"),
      supabase.from("agent_knowledge").select("title, content").eq("is_active", true),
      supabase
        .from("chat_messages")
        .select("role, content")
        .eq("conversation_id", conv!.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const cfg = cfgRes.data;
    if (!cfg) {
      return new Response(JSON.stringify({ ok: true, msg: "Agente desativado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bh = bhRes.data || [];
    const knowledge = knowledgeRes.data || [];
    const history = (historyRes.data || []).reverse();

    // AI Optimization: Relevance-based filtering for knowledge base to reduce prompt tokens
    const userMessageLower = (text || "").toLowerCase();
    const relevantKnowledge = knowledge.filter((k) => {
      if (knowledge.length <= 3) return true;
      const titleWords = (k.title || "").toLowerCase().split(/\s+/);
      return titleWords.some((word) => word.length > 3 && userMessageLower.includes(word)) ||
             (k.category && userMessageLower.includes(k.category.toLowerCase()));
    });
    const finalKnowledge = relevantKnowledge.length > 0 ? relevantKnowledge : knowledge.slice(0, 2);

    // 4. Construct System Prompt (Sovereign Rules)
    const systemPrompt = `
${cfg.system_prompt || "Você é o assistente da Axis Legis."}

# CONTEXTO TÉCNICO
- Horário Atual: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
- Horários da Empresa: ${JSON.stringify(bh)}
- Base de Conhecimento: ${finalKnowledge.map((k) => k.content).join(" ")}

# SACRED RULES (SOVEREIGN BEHAVIOR)
${cfg.rules_prompt || ""}
- One question at a time: NEVER ask multiple questions in one reply.
- No Lists: Prefer narrative flow over bullet points unless explicitly requested.
- Timezone Sovereignty: Always assume America/Sao_Paulo. Never mention UTC/Z to the user.
`;

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
    ];

    // 6. Route to correct provider/endpoint based on model and custom keys
    const modelName = cfg?.model || "google/gemini-2.0-flash";
    let apiEndpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let authHeader = `Bearer ${cfg?.lovable_api_key || Deno.env.get("LOVABLE_API_KEY")}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (modelName.startsWith("gpt-") || modelName.startsWith("o1-") || modelName.startsWith("o3-")) {
      if (cfg?.openai_api_key) {
        apiEndpoint = "https://api.openai.com/v1/chat/completions";
        authHeader = `Bearer ${cfg.openai_api_key}`;
      }
    } else if (modelName.includes("gemini")) {
      if (cfg?.gemini_api_key) {
        apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        authHeader = `Bearer ${cfg.gemini_api_key}`;
      }
    } else if (modelName.includes("anthropic/") || modelName.startsWith("claude-") || modelName.includes("/")) {
      if (cfg?.openrouter_api_key) {
        apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";
        authHeader = `Bearer ${cfg.openrouter_api_key}`;
        headers["HTTP-Referer"] = "https://axis-legis.com";
        headers["X-Title"] = "Axis Legis";
      }
    }

    headers["Authorization"] = authHeader;

    const aiRes = await fetch(apiEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelName,
        temperature: Number(cfg.temperature ?? 0.6),
        messages: [
          { role: "system", content: systemPrompt },
          ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!aiRes.ok) throw new Error("AI Gateway failure");

    const aiJson = await aiRes.json();
    const aiMsg = aiJson.choices?.[0]?.message;
    let reply = aiMsg?.content || "";

    // Capture and Log Token Usage
    const usage = aiJson.usage;
    if (usage) {
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || (promptTokens + completionTokens);
      const usedModel = aiJson.model || cfg.model || "google/gemini-2.0-flash";
      const costEstimate = calculateCost(usedModel, promptTokens, completionTokens);
      
      const { error: logErr } = await supabase
        .from("ai_token_usage")
        .insert({
          conversation_id: conv!.id,
          model: usedModel,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          cost_estimate: costEstimate,
          channel: "whatsapp"
        });
      
      if (logErr) {
        console.error("Failed to log token usage:", logErr);
      }
    }

    // 7. Handle Tool Execution (Sync with chat-ai)
    if (aiMsg?.tool_calls) {
      for (const call of aiMsg.tool_calls) {
        const fnName = call.function?.name;
        const args = JSON.parse(call.function?.arguments || "{}");

        if (fnName === "get_available_slots") {
          const date = args.date;
          const dayOfWeek = new Date(date + "T12:00:00").getDay();
          const { data: businessHours } = await supabase.from("business_hours").select("*").eq("day_of_week", dayOfWeek).maybeSingle();

          if (!businessHours || businessHours.is_closed) {
             reply = "Desculpe, não atendemos nesta data.";
          } else {
             const { data: existing } = await supabase
               .from("appointments")
               .select("appointment_time")
               .gte("appointment_time", `${date} 00:00:00-03`)
               .lte("appointment_time", `${date} 23:59:59-03`)
               .neq("status", "cancelled");

             const booked = (existing || []).map(a => new Date(a.appointment_time).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }));
             const slots = [];
             let current = businessHours.start_time.substring(0, 5);
             const end = businessHours.end_time.substring(0, 5);
             const lStart = businessHours.lunch_start ? businessHours.lunch_start.substring(0, 5) : null;
             const lEnd = businessHours.lunch_end ? businessHours.lunch_end.substring(0, 5) : null;

             while (current < end) {
               const isLunch = lStart && lEnd && current >= lStart && current < lEnd;
               if (!isLunch && !booked.includes(current)) {
                 slots.push(current);
               }
               const [h, m] = current.split(":").map(Number);
               const next = new Date(2000, 0, 1, h + 1, m);
               current = next.toTimeString().substring(0, 5);
             }
             reply = `Para o dia ${new Date(date + "T12:00:00").toLocaleDateString("pt-BR")}, temos estes horários: ${slots.join(", ")}. Algum desses funciona para você?`;
          }
        }

        if (fnName === "create_appointment") {
          let finalTime = args.appointment_time;
          if (!finalTime.includes("-") && !finalTime.includes("+")) {
             finalTime = finalTime.replace("T", " ") + "-03:00";
          }

          const targetDateTime = new Date(finalTime);
          const timeString = finalTime.split(" ")[1]?.substring(0, 5) || finalTime.split("T")[1]?.substring(0, 5) || "09:00";
          const dayOfWeek = targetDateTime.getDay();

          // 1. Validar horário de expediente e almoço
          const { data: bh } = await supabase
            .from("business_hours")
            .select("*")
            .eq("day_of_week", dayOfWeek)
            .maybeSingle();

          if (!bh || bh.is_closed) {
            reply = "Desculpe, o escritório está fechado no dia solicitado.";
          } else {
            const start = bh.start_time.substring(0, 5);
            const end = bh.end_time.substring(0, 5);
            const lStart = bh.lunch_start ? bh.lunch_start.substring(0, 5) : null;
            const lEnd = bh.lunch_end ? bh.lunch_end.substring(0, 5) : null;

            if (timeString < start || timeString >= end) {
              reply = `Desculpe, o horário solicitado (${timeString}) está fora do expediente de atendimento (${start} às ${end}).`;
            } else if (lStart && lEnd && timeString >= lStart && timeString < lEnd) {
              reply = `Desculpe, o horário de almoço (${lStart} às ${lEnd}) não está disponível para agendamentos.`;
            } else {
              // 2. Validar conflito de agendamento (mesmo horário)
              const { data: dup } = await supabase
                .from("appointments")
                .select("id")
                .eq("appointment_time", finalTime)
                .neq("status", "cancelled")
                .limit(1);

              if (dup && dup.length > 0) {
                reply = "Desculpe, esse horário já foi agendado por outra pessoa. Poderia escolher outro horário?";
              } else {
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
                  // Update conversation details to link lead information
                  await supabase
                    .from("chat_conversations")
                    .update({
                      contact_name: args.contact_name,
                      contact_phone: args.contact_phone,
                      contact_email: args.contact_email,
                    })
                    .eq("id", conv!.id);

                  const displayTime = finalTime.split(' ')[1]?.substring(0, 5) || finalTime.split('T')[1]?.substring(0, 5);
                  reply = reply || `Combinado! Seu agendamento foi solicitado para ${displayTime}.`;
                }
              }
            }
          }
        }
      }
    }

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
