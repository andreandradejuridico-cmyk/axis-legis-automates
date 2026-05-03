---
type: "codebase_map"
focus: "tech"
date: "2026-05-03"
---

# External Integrations

## Backend as a Service (BaaS)
- **Supabase**: Primary backend provider.
  - **PostgreSQL**: Relational database.
  - **Auth**: User authentication and roles management.
  - **Edge Functions**: Serverless compute for webhooks and AI integrations.

## Artificial Intelligence
- **Lovable AI Gateway**: Proxy gateway used to communicate with AI models (`google/gemini-2.5-flash`).
  - Integrated via `chat-ai` Supabase Edge Function.
  - Requires `LOVABLE_API_KEY` for authentication.

## Communication
- **Evolution API (WhatsApp)**: WhatsApp integration for receiving and sending messages.
  - Integrated via Supabase Edge Functions (`whatsapp-send` and `whatsapp-webhook`).
  - Configuration stored in `whatsapp_settings` table.
