---
type: "codebase_map"
focus: "concerns"
date: "2026-05-03"
---

# Areas of Concern

## Security & Authentication
- **RLS Policies**: Access to `chat_conversations` and `chat_messages` relies on strict Row Level Security (RLS) policies. Recent fixes (`20260503105446_fix_user_access.sql`) resolved an issue where users couldn't see their own conversations. These policies require careful maintenance.
- **Admin Roles**: The system relies on a custom `user_roles` table and RPC functions (`set_user_role`, `has_role`) to manage permissions. The trigger `on_auth_user_created` handles initial assignments, which can be fragile if not monitored.

## External API Dependencies
- **Lovable AI Gateway**: The `chat-ai` function depends entirely on `ai.gateway.lovable.dev`. Rate limits or credit exhaustion (429/402 HTTP status codes) are handled gracefully but represent a single point of failure.
- **Evolution API**: Webhooks from WhatsApp are critical for real-time messaging functionality. Any downtime in Evolution API or the Supabase webhook endpoint will drop messages.

## UI / UX
- **Admin Panel**: The admin panel (`Admin.tsx`) mixes multiple concerns (AI agent config, WhatsApp config, user management, and chat history) into a single large component. This could become difficult to maintain as more features are added.
- **Local Storage**: `ChatWidget.tsx` uses `localStorage` (`axis_chat_session`) to track anonymous user sessions. If cleared, the user loses their chat history link.
