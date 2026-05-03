---
type: "codebase_map"
focus: "tech"
date: "2026-05-03"
---

# Technology Stack

## Frontend Runtime & Framework
- **React 18**: Core library for UI.
- **Vite**: Build tool and dev server.
- **TypeScript**: Static typing for the entire codebase.

## Styling & UI Components
- **Tailwind CSS**: Utility-first styling framework.
- **shadcn/ui**: Component collection built on Radix UI (`@radix-ui/react-*`).
- **Lucide React**: Iconography.
- **Framer Motion**: Complex animations and transitions.

## Data & State Management
- **React Query (@tanstack/react-query)**: Server state management and caching.
- **Supabase JS Client**: Direct interaction with backend services (DB, Auth).
- **Local Storage**: Used occasionally for session storage (e.g. `axis_chat_session`).

## Forms & Validation
- **React Hook Form**: Form state management.
- **Zod**: Schema validation.

## Backend Runtime (Edge Functions)
- **Deno**: Runtime for Supabase Edge Functions.
- **TypeScript**: Used for all Edge Functions.
