# Code Review: Phase 02 (AI Agent & Scheduling)

## 📋 Overview
This review covers the implementation of the AI Agent configuration (Rules Prompt), the updated Chat Edge Function, and the Admin Dashboard refinements.

**Review Date:** 2026-05-04
**Depth:** Standard
**Files Reviewed:**
- `supabase/functions/chat-ai/index.ts`
- `src/pages/Admin.tsx`
- `src/components/ChatWidget.tsx`
- `supabase/migrations/20260504173200_add_rules_prompt.sql`

---

## 🔴 Critical Findings

### 1. Invalid Model Mapping (GPT-5 Mini)
- **Location:** `supabase/functions/chat-ai/index.ts:156`
- **Issue:** The code hardcodes a mapping from `gpt-4` to `openai/gpt-5-mini`.
- **Impact:** `gpt-5-mini` is not a valid OpenAI model name. Any configuration using a GPT-4 model will fail when calling the AI Gateway.
- **Recommendation:** Remove this line or map to a valid model like `gpt-4o-mini`.

### 2. Fragile Timezone "Radical Cleanup"
- **Location:** `supabase/functions/chat-ai/index.ts:225`
- **Issue:** Using `.replace(/Z|[+-]\d{2}:?\d{2}$/, "")` to strip timezone info.
- **Impact:** While intended to force "local time", stripping the 'Z' without ensuring the environment interprets it as the firm's local time (UTC-3) can lead to drift. `new Date()` behavior on stripped strings varies.
- **Recommendation:** Keep the ISO string intact but explicitly handle the UTC-3 offset in the database or when displaying.

### 3. Missing Permission Feedback in Admin
- **Location:** `src/pages/Admin.tsx:115`
- **Issue:** The `isAdmin` check is used to hide/show entire sections, but doesn't provide a "Access Denied" message if a user manually navigates or if the check fails silently.
- **Impact:** Confusion for users who might think the system is broken rather than knowing they lack permissions.

---

## 🟡 Warning Findings

### 1. Unbounded Appointments Query
- **Location:** `src/pages/Admin.tsx:130`
- **Issue:** `supabase.from("appointments").select("*")` fetches all records.
- **Impact:** Performance degradation as the firm records hundreds/thousands of appointments.
- **Recommendation:** Add `.limit(100)` or implement pagination/date-range filtering.

### 2. Edge Function Invocation Timeout
- **Location:** `src/components/ChatWidget.tsx:72`
- **Issue:** No timeout specified for the Edge Function call.
- **Impact:** UI might stay in "typing..." state indefinitely if the Edge Function hangs or the network is slow.

---

## 🔵 Info & Best Practices

### 1. Semantic HTML in Sidebar
- **Location:** `src/pages/Admin.tsx:310`
- **Observation:** Nav items are buttons. Using `NavLink` from `react-router-dom` would be more idiomatic and provide better accessibility/native active state handling.

### 2. Hardcoded Currency/Locale
- **Location:** `supabase/functions/chat-ai/index.ts:87`
- **Observation:** `toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })` is hardcoded.
- **Recommendation:** Consider moving the timezone to a system configuration table for scalability (multi-office support).

---

## 🚀 Next Steps
1. [ ] Fix the `gpt-5-mini` model mapping.
2. [ ] Refactor timezone handling in `chat-ai` to be more robust.
3. [ ] Add pagination to the Appointments table in Admin.
