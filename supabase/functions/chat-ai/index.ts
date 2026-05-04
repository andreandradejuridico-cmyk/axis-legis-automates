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
    // Format date for the AI in a very clear way
    const dateStr = now.toLocaleDateString('pt-BR');
    const dayName = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][now.getDay()];
    
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);
    const { data: apps } = await supabase.from("appointments")
      .select("appointment_time, duration_minutes")
      .gte("appointment_time", now.toISOString())
      .lte("appointment_time", next7Days.toISOString())
      .neq("status", "cancelled");

    const scheduleContext = `
      # REGRAS TÉCNICAS OBRIGATÓRIAS
      Você deve responder EXCLUSIVAMENTE em formato JSON.
      Estrutura esperada:
      {
        "reply": "Sua resposta textual para o cliente aqui",
        "quickReplies": ["Opção 1", "Opção 2"] (opcional, use apenas quando houver escolhas claras)
      }

      # FLUXO DE ATENDIMENTO (FRAGMENTADO)
      1. Pergunte quem o cliente representa. OPÇÕES OBRIGATÓRIAS: ["Escritório de Advocacia", "3º Setor", "Advogado Particular"].
      2. Pergunte o maior desafio de automação.
      3. Peça o Nome.
      4. Peça o WhatsApp.
      5. Ofereça agendamento baseado na grade.

      # CONTEXTO
      - Hoje: ${dateStr} (${dayName}) | Hora: ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      - Horários: ${JSON.stringify(bh)}
    `;

    // Load history
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(40);

    const messages = [
      { role: "system", content: `${scheduleContext}\n\nPERSONA E TOM DE VOZ:\n${cfg.system_prompt}` },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
    ];

    // Define Tools
    const tools = [
      {
        type: "function",
        function: {
          name: "book_appointment",
          description: "Registra um agendamento jurídico no banco de dados.",
          parameters: {
            type: "object",
            properties: {
              contact_name: { type: "string" },
              contact_phone: { type: "string" },
              contact_email: { type: "string" },
              legal_area: { type: "string" },
              subject: { type: "string" },
              appointment_time: { type: "string", description: "ISO YYYY-MM-DDTHH:mm:ss" },
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
        model: cfg.model || "gpt-4o",
        messages,
        tools,
        tool_choice: "auto",
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI Gateway failed: ${aiRes.status}`);

    const aiJson = await aiRes.json();
    const aiMsg = aiJson.choices?.[0]?.message;
    if (!aiMsg) throw new Error("No message returned from AI");

    let finalReply = "";
    let quickReplies: string[] = [];

    // Parse Initial JSON Response
    if (aiMsg.content) {
      try {
        const parsed = JSON.parse(aiMsg.content);
        finalReply = parsed.reply;
        quickReplies = parsed.quickReplies || [];
      } catch (e) {
        console.error("JSON Parse Error", e);
        finalReply = aiMsg.content; // fallback
      }
    }

    // Handle Tool Calls
    if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
      for (const call of aiMsg.tool_calls) {
        if (call.function.name === "book_appointment") {
          try {
            const args = JSON.parse(call.function.arguments);
            const { error: bookError } = await supabase.from("appointments").insert({
              contact_name: args.contact_name,
              contact_email: args.contact_email || "lead@axis.legis",
              contact_phone: args.contact_phone,
              legal_area: args.legal_area,
              subject: args.subject,
              appointment_time: args.appointment_time,
              notes: args.notes || "",
              status: "confirmed"
            });

            if (bookError) throw bookError;

            const confirmMessages = [
              ...messages,
              aiMsg,
              {
                role: "tool",
                tool_call_id: call.id,
                content: JSON.stringify({ status: "success" }),
              }
            ];

            const confirmRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: cfg.model || "gpt-4o",
                messages: confirmMessages,
                response_format: { type: "json_object" },
                temperature: 0.1,
              }),
            });
            const confirmJson = await confirmRes.json();
            const parsedConfirm = JSON.parse(confirmJson.choices?.[0]?.message?.content || "{}");
            finalReply = parsedConfirm.reply || "Agendamento confirmado!";
            quickReplies = parsedConfirm.quickReplies || [];
          } catch (err) {
            console.error("Tool execution failed:", err);
            finalReply = "Tive um problema técnico, mas já anotei seus dados. Entraremos em contato!";
          }
        }
      }
    }

    if (!finalReply) finalReply = "Desculpe, como posso ajudar?";

    // Save assistant message
    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "assistant",
      content: finalReply,
    });

    // DIAGNÓSTICO: Forçar botões se estiverem vazios
    if (!quickReplies || quickReplies.length === 0) {
      quickReplies = ["Escritório de Advocacia", "3º Setor", "Advogado Particular"];
    }

    return new Response(JSON.stringify({ reply: finalReply, conversationId: conv.id, quickReplies }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Edge Function Crash:", e);
    return new Response(JSON.stringify({ error: "Erro no processamento.", details: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
