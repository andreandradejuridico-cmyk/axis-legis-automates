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

    // Load Business Hours & Appointments for context
    const { data: bh } = await supabase.from("business_hours").select("*");
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);
    const { data: apps } = await supabase.from("appointments")
      .select("appointment_time, duration_minutes")
      .gte("appointment_time", now.toISOString())
      .lte("appointment_time", next7Days.toISOString())
      .neq("status", "cancelled");

    const scheduleContext = `
      CONTEXTO TEMPORAL: Hoje é ${now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.
      HORÁRIOS DE FUNCIONAMENTO: ${JSON.stringify(bh)}
      COMPROMISSOS JÁ AGENDADOS (próximos 7 dias): ${JSON.stringify(apps)}
      
      DIRETRIZES DE AGENDA:
      - Só ofereça horários que estejam dentro do funcionamento e que não conflitem com agendamentos existentes.
      - Você deve capturar Nome, WhatsApp, Área Jurídica (ex: Trabalhista, Cível), Assunto e Observações.
      - Quando o cliente escolher um horário, use a ferramenta 'book_appointment' para gravar.
    `;

    // Load history
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(40);

    const messages = [
      { role: "system", content: `${cfg.system_prompt}\n\n${scheduleContext}` },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
    ];

    // Define Tools
    const tools = [
      {
        type: "function",
        function: {
          name: "book_appointment",
          description: "Grava um novo agendamento no banco de dados.",
          parameters: {
            type: "object",
            properties: {
              contact_name: { type: "string" },
              contact_phone: { type: "string" },
              contact_email: { type: "string" },
              legal_area: { type: "string" },
              subject: { type: "string" },
              appointment_time: { type: "string", description: "ISO string da data/hora" },
              notes: { type: "string" },
            },
            required: ["contact_name", "contact_phone", "legal_area", "subject", "appointment_time"],
          },
        },
      },
    ];

    // AI Turn 1
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        tools,
        temperature: Number(cfg.temperature ?? 0.6),
      }),
    });

    if (!aiRes.ok) throw new Error(`AI gateway error: ${aiRes.status}`);
    const aiJson = await aiRes.json();
    const aiMsg = aiJson.choices?.[0]?.message;

    let finalReply = aiMsg.content;

    // Handle Tool Calls
    if (aiMsg.tool_calls) {
      for (const call of aiMsg.tool_calls) {
        if (call.function.name === "book_appointment") {
          const args = JSON.parse(call.function.arguments);
          const { error: bookError } = await supabase.from("appointments").insert({
            contact_name: args.contact_name,
            contact_email: args.contact_email || "sem-email@axis.legis",
            contact_phone: args.contact_phone,
            legal_area: args.legal_area,
            subject: args.subject,
            appointment_time: args.appointment_time,
            notes: args.notes || "",
            status: "confirmed"
          });

          if (bookError) {
             console.error("Booking Error:", bookError);
             finalReply = "Desculpe, tive um problema técnico ao tentar gravar seu agendamento. Pode tentar novamente em alguns minutos?";
          } else {
             // Second turn to confirm to user
             messages.push(aiMsg);
             messages.push({
               role: "tool",
               tool_call_id: call.id,
               content: JSON.stringify({ status: "success", message: "Agendamento confirmado no banco de dados." }),
             });

             const confirmRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
               method: "POST",
               headers: {
                 Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
                 "Content-Type": "application/json",
               },
               body: JSON.stringify({
                 model: cfg.model,
                 messages,
                 temperature: 0.3,
               }),
             });
             const confirmJson = await confirmRes.json();
             finalReply = confirmJson.choices?.[0]?.message?.content;
          }
        }
      }
    }

    if (!finalReply) finalReply = "Entendido. Como posso prosseguir?";

    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "assistant",
      content: finalReply,
    });

    return new Response(JSON.stringify({ reply: finalReply, conversationId: conv.id }), {
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
