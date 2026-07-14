# Job Market Explorer

AI-powered job market analytics dashboard. Users ask questions in plain English; the Claude API translates them into validated `QuerySpec` JSON, which the frontend executes against local data and renders as tables, charts, and stat cards. **Never render free-form AI text as the answer — only structured UI.**

Full product spec: `docs/spec.md`. Agent activity log: `docs/agent-log.md`.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` — production build (must pass before merging)
- `npm run typecheck` — tsc --noEmit (must pass before merging)
- `npm run lint` — eslint

## File map

- `src/lib/schema.ts` — **QuerySpec + QueryResult Zod schema/types. The contract for the whole app. Change here first; other lanes depend on it.**
- `src/lib/ai.ts` — AI provider abstraction (Gemini / Anthropic via fetch)
- `src/lib/data.ts` — aggregation helpers (async — awaits live Adzuna data)
- `src/lib/adzuna.ts` — **server-only** (`import "server-only"`), fetches real postings/salary/remote data from the Adzuna API, cached ~60s via Next's fetch `revalidate` (see Conventions below for why). Needs `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` (free at developer.adzuna.com) in `.env.local`. Two caching layers: React's `cache()` dedupes the JS call within one request (so `StatCards`+`SkillsTable`+`page.tsx` share one pass when rendering the same page), and Next's fetch `revalidate: 60` Data Cache dedupes the actual Adzuna HTTP calls *across* requests/routes (so `/api/ask` reuses the dashboard's cached responses instead of re-hitting Adzuna, as long as it's within the 60s window). `trend6mo` is a 7-day-vs-prior-7-day momentum proxy, not literal 6-month history — see file header for why. `remoteShare` is a "mentions remote" text-match proxy, not a structured field. 429s retry with backoff; a skill that still fails is dropped rather than crashing the page.
- `src/lib/query.ts` — `executeQuerySpec(spec, stats)`: filters/sorts live `SkillStat[]` per a validated `QuerySpec`, returns a `QueryResult`. `groupBy` is always resolved to `skill` and `lineChart` coerces to `barChart` — there's no time-series data source yet.
- `src/app/page.tsx` — dashboard home (`export const dynamic = "force-dynamic"` — never statically prerendered, since data must be live per request)
- `src/app/api/ask/route.ts` — AI query pipeline: question → Claude → Zod-validated `QuerySpec` → executed against live Adzuna data via `query.ts` → real `QueryResult`. A **second** AI call writes the insight sentence, given the real result data as context (the first call never sees actual numbers, only skill names — see file header).
- `src/components/AskBar.tsx` — client component: ask input, suggestion chips, renders the real `QueryResult` (table/statCard; `barChart` also renders as a table until Recharts lands, see task #2 below).
- `src/components/StatCards.tsx`, `src/components/SkillsTable.tsx` — server components

## Conventions

- TypeScript strict; no `any`. Validate all external input (API requests, AI output) with Zod at the boundary.
- Server components by default; `"use client"` only when interaction requires it.
- AI calls: provider-agnostic via `src/lib/ai.ts` (plain fetch, no SDK dependency). Supported: Gemini 2.5 Flash (free tier) and Claude Haiku, selected by env vars — see `.env.example`. All AI output must pass `QuerySpecSchema.safeParse` before reaching the UI. Fail with a friendly 422, never render unvalidated output.
- Styling: Tailwind CSS v4 + shadcn/ui (`src/components/ui/*`, generated via `npx shadcn add <component>` — treat as owned source, edit freely, don't hand-roll a component shadcn already provides). Design tokens live as CSS variables in `globals.css` under `:root`/`.dark`, wired into Tailwind via `@theme inline`. `components.json` controls generation (aliases, base color). Component libraries for data-heavy widgets (TanStack Table, Recharts) may still be added when building the table/chart lanes — prefer TanStack Table for sorting/filtering, layered on top of the shadcn `Table` primitive.
- Currency displayed as `$128K` style; percentages rounded to integers.
- Data: live from Adzuna (`src/lib/adzuna.ts`), no static snapshot file — genuinely real, not hand-maintained. Cached ~60s via Next's fetch `revalidate` (see file map above); this was added after an uncached version hit Adzuna's rate limit (429) within a few page reloads. This is an explicit tradeoff over the spec's original "never query third-party APIs per user request" guidance, in exchange for real data — see `docs/agent-log.md` 2026-07-14. Watch for: (1) Adzuna free-tier quota exhaustion under real traffic, (2) Vercel serverless function timeout on the Hobby plan (10s) — a cold cache paying for all skills' calls at once may be close to that ceiling once deployed. If either bites further, widen the revalidate window rather than reverting to a static snapshot file.
- Commit style: conventional-ish, present tense ("add salary histogram endpoint").

## Current status / next tasks

Phase 1 scaffold complete. Tailwind/shadcn migration done. Live Adzuna data wired up for 9 skills, cached ~60s. `/api/ask` now executes the QuerySpec against real data and writes a data-grounded insight (two AI calls: spec generation, then insight from real numbers) — `AskBar.tsx` renders actual results, not raw JSON.

1. Charts: add Recharts, replace the `barChart` table-fallback in `AskBar.tsx` with a real chart; requires a real time-series data source first (see `query.ts` — `groupBy: "month"` has nothing to group by yet).
2. If Adzuna quota or Vercel timeout becomes a problem post-launch: widen the revalidate window in `adzuna.ts` rather than reintroducing a static snapshot file.
3. Tests: Vitest for schema + data helpers (`query.ts` executor is a good first target); Playwright happy path (chip click → real result renders).
4. Rate limiting + caching on /api/ask before public launch — right now a burst of questions each triggers 2 Anthropic calls, uncached.

## Multi-agent workflow (Stage 6)

When swarming, each agent works in its own git worktree/branch and owns one lane (UI / API / charts / tests / ingest). Rules:

- `src/lib/schema.ts` changes require coordination — announce in the PR, don't merge silently.
- Every PR: `npm run typecheck && npm run build` green before review.
- Log what you did (and any failures) in `docs/agent-log.md`.
