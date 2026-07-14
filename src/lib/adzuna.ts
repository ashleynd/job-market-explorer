import "server-only";
import { cache } from "react";
import type { SkillStat } from "@/lib/schema";

/**
 * Live Adzuna fetch — server-only. Underlying HTTP calls are cached via
 * Next's fetch Data Cache for REVALIDATE_SECONDS (genuinely live data,
 * refreshed roughly every minute, without refiring ~24 API calls on
 * every single page reload — that hit Adzuna's rate limit almost
 * immediately when this ran fully uncached). The route itself still
 * re-renders per request (see `dynamic = "force-dynamic"` in
 * page.tsx); only the Adzuna HTTP responses are briefly cached.
 * Results are additionally wrapped in React's cache() so the 3
 * components that need this data within one request/render share a
 * single pass.
 *
 * trend6mo is a (last 7 days vs prior 7 days) momentum proxy. Adzuna has
 * no history endpoint for arbitrary keyword search, and its "days old"
 * filter counts currently-live listings — older listings get delisted
 * faster than they accumulate, which biases any such proxy upward. A
 * 7-day window keeps that bias small; it is still an approximation, not
 * literal 6-month history.
 *
 * remoteShare is a text-match proxy: (postings matching skill AND
 * "remote") / (postings matching skill) — Adzuna has no universal
 * remote flag.
 *
 * A skill that fails after retries (e.g. persistent 429) is dropped
 * from the result rather than crashing the whole page.
 */

interface SkillQuery {
  skill: string;
  phrase: string;
}

// what_phrase values favor precision over recall — several skill names
// are ambiguous English words (Jest, Express), so every query is scoped
// to category=it-jobs.
const SKILL_QUERIES: SkillQuery[] = [
  { skill: "TypeScript", phrase: "TypeScript" },
  { skill: "JavaScript", phrase: "JavaScript" },
  { skill: "React", phrase: "React" },
  { skill: "Python", phrase: "Python" },
  { skill: "AI/LLM integration", phrase: "LLM" },
  { skill: "Node.js", phrase: "Node.js" },
  { skill: "Next.js", phrase: "Next.js" },
  { skill: "GraphQL", phrase: "GraphQL" },
  { skill: "SQL", phrase: "SQL" },
];

const CONCURRENCY = 4;
const REVALIDATE_SECONDS = 60;
const MAX_RETRIES = 3;

export function getSkillNames(): string[] {
  return SKILL_QUERIES.map((q) => q.skill);
}

interface AdzunaResponse {
  count: number;
  results: Array<{ salary_min?: number; salary_max?: number }>;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function adzunaSearch(params: Record<string, string>): Promise<AdzunaResponse> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = process.env.ADZUNA_COUNTRY || "us";
  if (!appId || !appKey) {
    throw new Error("Missing ADZUNA_APP_ID / ADZUNA_APP_KEY");
  }

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("content-type", "application/json");
  url.searchParams.set("category", "it-jobs");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (res.ok) return res.json() as Promise<AdzunaResponse>;

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 500 * 2 ** attempt;
      await sleep(delay);
      continue;
    }
    throw new Error(`Adzuna ${res.status} ${res.statusText}`);
  }
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

async function fetchSkillStat(query: SkillQuery): Promise<SkillStat> {
  const [recent, trailing14, remote] = await Promise.all([
    adzunaSearch({ what_phrase: query.phrase, max_days_old: "7", results_per_page: "50" }),
    adzunaSearch({ what_phrase: query.phrase, max_days_old: "14", results_per_page: "0" }),
    adzunaSearch({
      what_phrase: query.phrase,
      what: "remote",
      max_days_old: "7",
      results_per_page: "0",
    }),
  ]);

  const priorWindowCount = Math.max(trailing14.count - recent.count, 0);
  const trend6mo =
    priorWindowCount > 0
      ? (recent.count - priorWindowCount) / priorWindowCount
      : recent.count > 0
        ? 1
        : 0;

  const salaries = recent.results
    .filter((r) => r.salary_min && r.salary_max)
    .map((r) => Math.round(((r.salary_min as number) + (r.salary_max as number)) / 2));
  const medianSalary = median(salaries) ?? 0;

  const remoteShare = recent.count > 0 ? Math.min(remote.count / recent.count, 1) : 0;

  return {
    skill: query.skill,
    postings: recent.count,
    trend6mo: Math.round(trend6mo * 100) / 100,
    medianSalary,
    remoteShare: Math.round(remoteShare * 100) / 100,
  };
}

async function fetchAllSkillStats(): Promise<SkillStat[]> {
  const results: SkillStat[] = [];
  for (let i = 0; i < SKILL_QUERIES.length; i += CONCURRENCY) {
    const batch = SKILL_QUERIES.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((q) => fetchSkillStat(q)));
    for (const [j, outcome] of settled.entries()) {
      if (outcome.status === "fulfilled") {
        results.push(outcome.value);
      } else {
        console.warn(`Adzuna fetch failed for ${batch[j].skill}:`, outcome.reason);
      }
    }
  }
  return results;
}

// React's per-request cache — dedupes the fetch across StatCards,
// SkillsTable, and page.tsx within a single render.
export const getLiveSkillStats = cache(fetchAllSkillStats);
