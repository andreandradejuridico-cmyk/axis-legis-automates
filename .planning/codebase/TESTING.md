---
type: "codebase_map"
focus: "quality"
date: "2026-05-03"
---

# Testing

## Frameworks
- **Vitest**: Setup for unit and integration testing (`vitest.config.ts`).
- **Playwright**: Setup for End-to-End (E2E) testing (`playwright.config.ts`).
- **React Testing Library**: Used alongside Vitest for DOM testing (`@testing-library/react`, `@testing-library/jest-dom`).

## Configuration
- Vitest is configured to run tests efficiently using Vite.
- Playwright has fixtures and configurations defined in the root directory.

## Current State
- The structure for testing is established, but there may be limited test coverage for new components (e.g., `ChatWidget.tsx`, `Admin.tsx`).
- Edge functions do not have explicit test runners configured in the current setup.
