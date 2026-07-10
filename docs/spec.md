# Job Market Explorer — Project Spec

**Working name:** Job Market Explorer (rename later — e.g. "StackSignal", "MarketPulse", "DevDemand")
**Author:** Ashley Dragan
**Goal:** Public, clickable portfolio project demonstrating AI-integrated data product engineering in TypeScript, built using Stage 5 → Stage 6 AI development workflows.

---

## 1. Elevator pitch

A live dashboard that answers questions about the tech job market in plain English. Users explore skill demand, salary trends, and remote-work data through tables and charts — or type a question like "Is React demand growing?" and get a structured, visual answer powered by the Claude API.

**One-line resume framing:** *Built and deployed an AI-powered job market analytics platform (Next.js, TypeScript, Claude API) using parallel AI agent orchestration.*

---

## 2. Why this project

- **Corroborates your resume.** It's the public sibling of DeepBI/DeepSearch — data tables, reporting UI, natural-language configuration for non-technical users.
- **Repositions you** from "frontend engineer" (AI-pressured category) into "frontend engineer who ships AI-integrated data products" (postings up ~85% YoY).
- **Audience overlap:** the recruiters and engineers clicking your resume link are the tool's target users.
- **Stage advancement:** the build process itself moves you from Stage 5 (CLI, single agent) to Stage 6 (multi-agent swarming).

---

## 3. Data sources

Start with one, add more later. All free tiers:

| Source | What it gives you | Notes |
|---|---|---|
| **Adzuna API** (developer.adzuna.com) | Broad job postings, salary data, historical trends, category stats | Free dev tier; best all-around source. Has dedicated salary/histogram endpoints |
| **Remotive API** | All active remote job listings, JSON | Completely free, no key required; remote-jobs angle |
| **USAJobs API** (developer.usajobs.gov) | US federal postings | Free with key; good structured data |
| **HN "Who is hiring" via Algolia API** | Monthly hiring threads | Free; great for trend snapshots, fun differentiator |

**Strategy:** ingest on a schedule (daily/weekly), normalize into your own schema, store aggregates. Never query third-party APIs per user request — that keeps the site fast, free-tier-safe, and shows real data engineering (normalization across sources mirrors your "13 integrated data connections" experience).

**Fallback:** ship v1 with a curated static snapshot (JSON/SQLite) so the demo never breaks, then layer live ingestion on top.

---

## 4. Features

### v1 (MVP — ship in ~2–3 weeks)
1. **Dashboard home:** stat cards (postings analyzed, top skill trend, median salary, remote share), skill-demand table with 6-month trend deltas, 1–2 charts.
2. **Ask bar:** natural-language question → Claude API → **structured JSON** (validated with Zod) specifying filters/aggregation/visualization → rendered as table/chart/stat cards. Never a chat transcript.
3. **Suggestion chips:** 3–5 pre-baked queries that always work (guaranteed demo path for recruiters).
4. **AI insight callout:** one short generated summary per view.
5. **Skills page:** sortable/filterable table (TanStack Table) — postings count, trend, median salary, remote share per skill.
6. **About page:** architecture diagram, data sources, and a "how this was built with AI agents" writeup. This page is *for employers* — it's your process portfolio.

### v2 (roadmap — shows iteration)
- Resume-match: paste a resume, see fit against live market data (differentiated version of the resume-analyzer idea).
- Salary explorer with distribution histograms (Adzuna histogram endpoint).
- Trend alerts / monthly digest page (LinkedIn content engine).
- Saved views via URL state.

---

## 5. Architecture

```
┌─────────────────────────────────────────────────┐
│  Next.js 15 (App Router) — TypeScript strict     │
│                                                  │
│  UI: React + TanStack Table + Recharts          │
│      (or Ant Design to mirror your resume)       │
│                                                  │
│  /api/ask ──► Claude API (structured output)     │
│              └─► Zod-validated QuerySpec JSON    │
│              └─► executed against local data     │
│                                                  │
│  /api/data ──► aggregated stats (cached)         │
└─────────────────────────────────────────────────┘
          ▲
          │ scheduled ingest (GitHub Action or Vercel Cron)
          │
   Adzuna / Remotive / USAJobs → normalize → store
   (Neon Postgres free tier, or Turso/SQLite,
    or precomputed JSON committed to repo for v1)
```

### Key decisions
- **TypeScript strict mode, end to end.** Shared types between ingest, API, and UI.
- **Structured AI output, not chat.** The `/api/ask` route sends the question + data schema to Claude, requests a `QuerySpec` (filters, groupBy, metric, chartType), validates with Zod, and rejects/retries on invalid output. This is the strongest AI-engineering signal in the project.
- **AI insights generated at ingest time** where possible (cached), not per page view — cost control + speed.
- **Rate limit + cache `/api/ask`** (e.g. Vercel KV or in-memory LRU): public AI endpoints need abuse protection; mentioning this in the README is another senior signal.
- **Testing:** Vitest for the query-spec executor and Zod schemas; Playwright for one happy-path e2e (chip click → table renders).
- **CI:** GitHub Actions — typecheck, lint, test on PR (you already list GitHub Actions on your resume).

### Hosting
- **Vercel** free tier: auto-deploys from GitHub, custom domain optional, Vercel Cron for ingest.
- Claude API key as env var; costs stay in the dollars/month range with caching + Haiku for insight generation.

---

## 6. Stage 5 → Stage 6 build plan

The repo's commit history and README should *document* this progression — that's the meta-portfolio.

### Phase 1 — Stage 5 (single CLI agent, week 1)
- One Claude Code instance: scaffold Next.js app, set up CI, build ingest script for first data source, static dashboard with real data.
- Write a thorough `CLAUDE.md` (project conventions, file map, commands). This is the prerequisite for swarming — agents are only as parallel as your docs allow.

### Phase 2 — Stage 6 (swarming, weeks 2–3)
Run 3–5 parallel Claude Code agents in separate git worktrees, each owning a lane:

| Agent | Lane |
|---|---|
| A | Table/dashboard UI components |
| B | `/api/ask` route + Claude structured-output pipeline + Zod schemas |
| C | Charts + stat cards |
| D | Tests (Vitest units, Playwright e2e) |
| E (optional) | Second data source ingest + normalization |

Practices to adopt (and write about):
- One worktree + branch per agent; you review and merge PRs.
- Shared contracts first: define the `QuerySpec` type and API shapes *before* parallelizing so lanes don't collide.
- Keep a `docs/agent-log.md`: what each agent did, where they failed, what you fixed. This becomes the About-page writeup and interview material.

### Phase 3 — polish + publish
- About page with architecture + agent-workflow writeup.
- README with screenshots, live link, and "built with N parallel AI agents" section.
- Post on LinkedIn; pin repo on GitHub profile.

---

## 7. Resume bullets (draft)

- Designed and deployed **[name]**, a public AI-powered job market analytics platform in TypeScript, Next.js, and React, translating natural-language questions into validated structured queries via the Claude API and rendering results as interactive tables and charts. *(live: [link])*
- Orchestrated 3–5 parallel AI coding agents in isolated git worktrees to deliver UI, API, and test lanes concurrently, documenting the multi-agent workflow and reducing build time an estimated NX.
- Engineered scheduled data ingestion normalizing job posting data across 2+ external APIs (Adzuna, Remotive) into typed aggregates served through cached API routes on Vercel.

*(Replace NX with your real measurement — track it as you go.)*

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Job APIs restrict/limit access | Static snapshot fallback baked into repo; site always demos |
| Claude API cost from public traffic | Cache aggressively, rate-limit `/api/ask`, use Haiku for insights, cap monthly spend |
| Malformed AI output breaks UI | Zod validation + retry + graceful "couldn't parse that" state |
| Scope creep | v1 list above is the contract; everything else is v2 |
| Demo fails during an interview | Suggestion chips hit cached, guaranteed-good queries |

---

## 9. Milestones

| Week | Deliverable |
|---|---|
| 1 | Stage 5: scaffold, CI, first ingest, static dashboard live on Vercel |
| 2 | Stage 6: swarm on ask-bar pipeline, tables, charts, tests |
| 3 | Polish, About page, README, LinkedIn post — **v1 launch** |
| 4+ | v2: resume-match, salary histograms, monthly digest |
