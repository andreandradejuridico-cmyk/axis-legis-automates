---
type: "codebase_map"
focus: "arch"
date: "2026-05-03"
---

# Architecture

## System Design
The application follows a standard Single Page Application (SPA) architecture combined with a Backend-as-a-Service (BaaS) pattern.

## Frontend Architecture (React)
- **Routing**: Client-side routing managed by `react-router-dom` with guards (e.g. `AdminGuard.tsx`).
- **Data Fetching**: Direct connections to Supabase PostgreSQL using Row Level Security (RLS) policies.
- **Component Model**: Component-based UI with strong separation between pages (`src/pages/`) and reusable widgets/blocks (`src/components/`).

## Backend Architecture (Supabase)
- **Database**: PostgreSQL with strict RLS policies to control user vs admin access.
- **Serverless Tier**: Deno-based Edge Functions hosted on Supabase.
  - **Webhooks**: Handles incoming HTTP requests (e.g., from Evolution API).
  - **Proxies**: Acts as a secure proxy to external APIs (e.g., Lovable AI Gateway) to hide API keys from the frontend.

## Data Flow (Chat Example)
1. **Frontend**: User types message in `ChatWidget.tsx`.
2. **RPC**: Frontend invokes `chat-ai` edge function via Supabase JS client.
3. **Backend**: `chat-ai` function inserts user message into DB, fetches conversation history.
4. **External Call**: `chat-ai` function calls Lovable AI Gateway to generate a response.
5. **Backend**: AI response is saved to DB.
6. **Frontend**: Edge function returns response to frontend to render.
