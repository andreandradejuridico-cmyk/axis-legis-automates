# AI Eval Review: Phase 02 (AI Agent & Scheduling)

| Dimension | Score | Verdict |
|-----------|-------|---------|
| **Strategy & Planning** | 20/100 | SIGNIFICANT GAPS |
| **Implementation Coverage** | 40/100 | NEEDS WORK |
| **Monitoring & Tracing** | 0/100 | NOT IMPLEMENTED |
| **Dataset & Benchmarking** | 10/100 | SIGNIFICANT GAPS |
| **OVERALL SCORE** | **18/100** | **SIGNIFICANT GAPS** |

---

## 📋 Overview
Phase 02 successfully implemented the core AI capabilities (Scheduling, Tool Calling, RAG-lite, and JSON Mode). However, from an **AI Evaluation** perspective, the phase skipped almost all validation gates. The system currently relies on "hope-based engineering" (manual testing and prompt-tuning) rather than deterministic evaluation.

---

## 🔴 Critical Gaps

### 1. No Tracing Infrastructure
- **Issue:** The `chat-ai` edge function performs direct calls to the AI Gateway without any observability layer.
- **Impact:** We cannot debug failed tool calls, analyze latency, or cluster user failures in production.
- **Remediation:** Integrate **Langfuse** or **LangSmith** to capture traces, including tool inputs/outputs.

### 2. Lack of Evaluation Datasets
- **Issue:** There is no reference dataset of "Golden Answers" for scheduling or lead qualification.
- **Impact:** Any change to the system prompt (e.g., adding a rule) could cause a regression in tool-calling accuracy without us knowing.
- **Remediation:** Create a `tests/evals/scheduling.json` with 20 scenarios (Valid schedule, Invalid time, Missing data, etc.).

### 3. Naive Knowledge Injection (RAG-lite)
- **Issue:** The system fetches *all* active knowledge records and dumps them into the system prompt.
- **Impact:** Context window overflow and "Lost in the Middle" syndrome as the knowledge base grows.
- **Remediation:** Implement Vector Search (pgvector) to inject only relevant chunks.

### 4. No Automated AI Unit Tests
- **Issue:** Tool call logic is buried in the edge function and not unit-tested.
- **Impact:** Recent "fuso horário" (timezone) fixes are fragile and could be broken by future prompt updates.
- **Remediation:** Implement `vitest` mocks for the AI Gateway to verify tool selection logic.

---

## 🟡 Warning Findings

### 1. Hallucination Control via Append-only Prompts
- **Issue:** Hardcoding rules like `[REGRAS: 1 POR VEZ]` in every user message is a "band-aid".
- **Impact:** Increases token cost and makes the agent feel repetitive or rigid.
- **Recommendation:** Move behavior constraints to a dedicated `Sacred Rules` prompt block and use a structured system prompt template.

---

## 🔵 Best Practices implemented
- ✅ **Tool Calling:** Using OpenAI-style tool schemas is the correct approach for deterministic behavior.
- ✅ **Admin Control:** Moving prompts to the database (ai_agent_config) allows for quick iteration without redeploys.
- ✅ **JSON Mode:** Using tool calls for buttons ensures the UI doesn't break on text-only responses.

---

## 🚀 Remediation Plan

1. **[URGENT] Infrastructure:** Set up Langfuse/LangSmith tracing in `chat-ai` Edge Function.
2. **[PHASE 3] Dataset:** Curate a "Golden Dataset" for the intake process.
3. **[PHASE 3] Validation:** Run a `promptfoo` benchmark to compare `gemini-2.0-flash` vs `gpt-4o-mini` for tool-calling reliability in our domain.
