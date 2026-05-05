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

    // 3. Load Context & Config (Sync with chat-ai)
    const [cfgRes, bhRes, knowledgeRes] = await Promise.all([
      supabase.from("ai_agent_config").select("*").eq("enabled", true).maybeSingle(),
      supabase.from("business_hours").select("*"),
      supabase.from("agent_knowledge").select("title, content").eq("is_active", true),
    ]);

    const cfg = cfgRes.data;
    if (!cfg) {
      return new Response(JSON.stringify({ ok: true, msg: "Agente desativado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bh = bhRes.data || [];
    const knowledge = knowledgeRes.data || [];

    // 4. Construct System Prompt (Sovereign Rules)
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

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model || "google/gemini-2.0-flash",
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
             const { data: existing } = await supabase.from("appointments").select("appointment_time").gte("appointment_time", `${date} 00:00:00-03`).lte("appointment_time", `${date} 23:59:59-03`);
             const booked = (existing || []).map(a => new Date(a.appointment_time).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }));
             const slots = [];
             let current = businessHours.start_time.substring(0, 5);
             const end = businessHours.end_time.substring(0, 5);
             while (current < end) {
               if (!booked.includes(current)) slots.push(current);
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
            reply = reply || `Combinado! Seu agendamento foi solicitado para ${displayTime}.`;
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
