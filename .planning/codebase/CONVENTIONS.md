---
type: "codebase_map"
focus: "quality"
date: "2026-05-03"
---

# Conventions

## Code Style & Organization
- **Functional Components**: React components are written as arrow functions.
- **Hooks**: Extensive use of React hooks (`useState`, `useEffect`) and custom hooks when necessary.
- **Styling**: Tailwind utility classes combined using `cn()` utility (provided by `clsx` and `tailwind-merge`) to handle conditional classes efficiently.
- **Typings**: TypeScript types/interfaces defined at the top of files or in dedicated `.ts` files.

## Error Handling
- **Supabase Errors**: Checked explicitly after DB queries (e.g., `if (error) { toast.error(error.message); }`).
- **UI Feedback**: `sonner` is used for toast notifications to provide user feedback on success and failure.

## Naming Conventions
- PascalCase for React components and files containing them (`ChatWidget.tsx`).
- camelCase for functions, variables, and hooks (`useToast`, `viewHistory`).
- kebab-case for CSS classes (via Tailwind).
- lowercase with underscores or hyphens for Supabase edge functions (`whatsapp-webhook`, `chat-ai`).
