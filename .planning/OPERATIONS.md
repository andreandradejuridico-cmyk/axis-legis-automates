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

## 🤖 Arquitetura da IA (Chat)

A IA opera em **Modo JSON Estrito**. Isso é fundamental para a estabilidade dos botões (Quick Replies).

- **Formato de Resposta:** Sempre um objeto `{ "reply": "...", "quickReplies": [...] }`.
- **Hierarquia de Prompt:** O servidor injeta regras de agendamento (Regras de Ouro) que têm prioridade sobre o System Prompt do Painel Admin.
- **Fragmentação:** A IA é instruída a nunca pedir mais de uma informação por vez.

### ⚠️ Cuidados ao alterar o Prompt no Painel:
- Não tente criar listas de perguntas (Pergunta 1, 2, 3) no prompt do painel, pois a IA as ignorará para manter o fluxo fragmentado.
- Use o prompt apenas para definir a "personalidade" e o tom de voz.
- Os botões de identificação (Escritório, 3º Setor, Advogado Particular) são gerados automaticamente pelo sistema no início da conversa.
