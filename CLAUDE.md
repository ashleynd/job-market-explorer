# Job Market Explorer

AI-powered job market analytics dashboard. Users ask questions in plain English; the Claude API translates them into validated `QuerySpec` JSON, which the frontend executes against local data and renders as tables, charts, and stat cards. **Never render free-form AI text as the answer — only structured UI.**

Full product spec: `docs/spec.md`. Agent activity log: `docs/agent-log.md`.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` — production build (must pass before merging)
- `npm run typecheck` — tsc --noEmit (must pass before merging)
- `npm run lint` — eslint

## File map

- `src/lib/schema.ts` — **QuerySpec Zod schema + shared types. The contract for the whole app. Change here first; other lanes depend on it.**
- `src/lib/data.ts` — data access + aggregation helpers
- `src/data/snapshot.ts` — static demo data (replaced by ingest pipeline later)
- `src/app/page.tsx` — dashboard home (server component)
- `src/app/api/ask/route.ts` — AI query pipeline (question → Claude → Zod-validated QuerySpec)
- `src/components/AskBar.tsx` — client component: ask input + suggestion chips
- `src/components/StatCards.tsx`, `src/components/SkillsTable.tsx` — server components

## Conventions

- TypeScript strict; no `any`. Validate all external input (API requests, AI output) with Zod at the boundary.
- Server components by default; `"use client"` only when interaction requires it.
- AI calls: use `claude-haiku-4-5` via fetch (no SDK dependency). All AI output must pass `QuerySpecSchema.safeParse` before reaching the UI. Fail with a friendly 422, never render unvalidated output.
- Plain CSS in `globals.css` for now (design tokens as CSS variables). Component libraries (TanStack Table, Recharts) may be added when building the table/chart lanes — prefer TanStack Table for sorting/filtering.
- Currency displayed as `$128K` style; percentages rounded to integers.
- Commit style: conventional-ish, present tense ("add salary histogram endpoint").

## Current status / next tasks

Phase 1 scaffold complete (static dashboard + mock-capable /api/ask).

1. Execute QuerySpec client-side: map a validated spec to real aggregations in `src/lib/data.ts` and render the right visualization in `AskBar.tsx` (currently shows raw JSON — see TODO).
2. Charts: add Recharts, render lineChart/barChart specs.
3. Ingest: scheduled script pulling Adzuna and/or Remotive into a normalized snapshot (see docs/spec.md §3).
4. Tests: Vitest for schema + data helpers; Playwright happy path (chip click → result renders).
5. Rate limiting + caching on /api/ask before public launch.

## Multi-agent workflow (Stage 6)

When swarming, each agent works in its own git worktree/branch and owns one lane (UI / API / charts / tests / ingest). Rules:

- `src/lib/schema.ts` changes require coordination — announce in the PR, don't merge silently.
- Every PR: `npm run typecheck && npm run build` green before review.
- Log what you did (and any failures) in `docs/agent-log.md`.
