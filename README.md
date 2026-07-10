# Job Market Explorer

Ask questions about the tech job market in plain English — skill demand, salaries, and remote-work trends — and get answers as interactive tables and charts, not chat text.

**Live demo:** _coming soon (Vercel)_

## How it works

Natural-language questions are sent to the Claude API, which returns a structured `QuerySpec` (metric, filters, visualization type) validated with Zod. The frontend executes that spec against aggregated job market data and renders the result as tables, charts, or stat cards. The AI never returns free text to the UI — every response is schema-validated structured output.

```
question ──► /api/ask ──► Claude API ──► QuerySpec JSON ──► Zod ──► table / chart / stat card
```

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Zod · Claude API · Vercel

## Getting started

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY (optional — mock mode without it)
npm run dev
```

## Built with AI agents

This project is also an experiment in AI-assisted development: Phase 1 was scaffolded with a single CLI agent (Stage 5), and feature lanes are built by parallel Claude Code agents in isolated git worktrees (Stage 6). See `docs/agent-log.md` for the workflow log and `CLAUDE.md` for agent conventions.

## Roadmap

- v1: dashboard, ask bar with structured AI queries, skills table, about page
- v2: resume-match against live market data, salary histograms, monthly digest

## Data sources

Demo snapshot today; scheduled ingestion from [Adzuna](https://developer.adzuna.com/), [Remotive](https://remotive.com/), and USAJobs planned. See `docs/spec.md`.
