---
type: "codebase_map"
focus: "arch"
date: "2026-05-03"
---

# Directory Structure

## Top-Level Directories
- `src/` - Frontend application source code.
- `supabase/` - Backend schema, migrations, and serverless functions.
- `public/` - Static assets.
- `.planning/` - GSD project planning documentation and codebase map.

## Frontend (`src/`)
- `src/pages/` - Top-level route components (`Admin.tsx`, `Index.tsx`, `AdminLogin.tsx`).
- `src/components/` - Reusable UI components.
  - `ui/` - shadcn/ui primitives (`dialog.tsx`, `button.tsx`, etc.).
  - `ChatWidget.tsx` - Floating chat interface.
  - `AdminGuard.tsx` - Route protection wrapper.
- `src/integrations/` - Third-party client setups.
  - `supabase/` - Database types and initialized client.
- `src/hooks/` - Custom React hooks.
- `src/lib/` - Utility functions (e.g., `utils.ts` for Tailwind class merging).
- `src/test/` - Frontend testing setup.

## Backend (`supabase/`)
- `supabase/functions/` - Deno Edge Functions.
  - `chat-ai/` - AI chat logic.
  - `whatsapp-send/` - WhatsApp outbound integration.
  - `whatsapp-webhook/` - WhatsApp inbound webhooks.
- `supabase/migrations/` - Ordered SQL files defining schema, triggers, roles, and RLS policies.
