# Operations & Maintenance Protocol

## 🛠️ Database Synchronization (SQL Manual Update)

**IMPORTANT:** Due to occasional synchronization delays between the Git repository and the Supabase production environment, the following protocol MUST be followed after any modification involving Database Schema (Migrations):

1. **Verify Migrations:** After a code push, check if the changes are reflected in the Lovable/Supabase dashboard.
2. **Manual Execution (Safety Net):** If the database structure does not update automatically, copy the content of the latest `.sql` file from `supabase/migrations/` and run it manually in the **Lovable SQL Editor**.
3. **Reasoning:** This ensures that the frontend (UI) and the backend (DB) stay in perfect harmony, avoiding `403 Forbidden` errors or missing table issues.

## 🔑 Permissions & Roles
- Access to `Admin.tsx` is guarded by `AdminGuard.tsx`.
- Only users with the `admin` role in `public.user_roles` can access configuration tabs (Agente IA, WhatsApp, Horários, Permissões).
- If locked out, use the SQL Editor to force the `admin` role as documented in `PROJECT.md`.

## 🤖 AI Agent Maintenance
- The system prompt is stored in `ai_agent_config`.
- Changes to the scheduling logic must be reflected in the Edge Functions (`supabase/functions/chat-ai`).
