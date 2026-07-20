import { z } from "zod";
import type { SkillStat } from "@/lib/schema";
import { askModel, resolveProvider, type Provider } from "@/lib/ai";
import { extractJson } from "@/lib/querySpec";

/**
 * AI-labeled category badges for the dashboard's skill overview —
 * a second, distinct AI surface from the Ask bar. Closed vocabulary
 * (validated via Zod) so this stays "structured output only," same
 * discipline as the rest of the app.
 *
 * page.tsx is force-dynamic (re-renders every request), so this would
 * otherwise fire a fresh AI call on every dashboard load. A small
 * in-memory cache (keyed by a fingerprint of the live stats, ~60s TTL)
 * keeps it to roughly one call per Adzuna refresh window instead —
 * same live-but-not-hammered tradeoff as adzuna.ts's revalidate: 60,
 * implemented manually here since ai.ts's fetch calls are POST-based
 * and not verified to participate in Next's Data Cache the same way.
 */

export const CATEGORY_LABELS = [
  "Rising",
  "Declining",
  "High-paying",
  "Remote-friendly",
  "High-volume",
] as const;
export type CategoryLabel = (typeof CATEGORY_LABELS)[number];
export type SkillCategoryMap = Record<string, CategoryLabel[]>;

const CategoriesResponseSchema = z.object({
  categories: z.record(z.string(), z.array(z.enum(CATEGORY_LABELS)).max(2)),
});

const CACHE_TTL_MS = 60_000;
let cache: { key: string; data: SkillCategoryMap; expiresAt: number } | null = null;

export async function getSkillCategories(stats: SkillStat[]): Promise<SkillCategoryMap> {
  const key = JSON.stringify(
    stats.map((s) => [s.skill, s.postings, s.medianSalary, s.remoteShare, s.trend6mo])
  );
  if (cache && cache.key === key && cache.expiresAt > Date.now()) return cache.data;

  const provider = resolveProvider();
  const data = provider
    ? await aiCategories(stats, provider).catch(() => fallbackCategories(stats))
    : fallbackCategories(stats);

  cache = { key, data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

async function aiCategories(stats: SkillStat[], provider: Provider): Promise<SkillCategoryMap> {
  const system = [
    `You label tech skills using real job market data, with ONLY these category labels: ${CATEGORY_LABELS.join(", ")}.`,
    "Assign each skill 0-2 labels that are clearly supported by its numbers relative to the other skills listed — don't force labels onto every skill.",
    "Respond with ONLY a valid JSON object, no prose, matching this shape:",
    `{"categories":{"<skill>":["<label>","<label>"]}}`,
  ].join("\n");
  const data = stats
    .map(
      (s) =>
        `${s.skill}: ${s.postings} postings, $${s.medianSalary} median salary, ${Math.round(s.remoteShare * 100)}% remote, ${Math.round(s.trend6mo * 100)}% 7-day trend`
    )
    .join("\n");
  const text = await askModel(provider, system, `Skills data:\n${data}`);
  const parsed = CategoriesResponseSchema.safeParse(extractJson(text));
  if (!parsed.success) throw new Error("Invalid categories response");

  const result: SkillCategoryMap = {};
  for (const s of stats) {
    result[s.skill] = (parsed.data.categories[s.skill] ?? []).slice(0, 2);
  }
  return result;
}

function fallbackCategories(stats: SkillStat[]): SkillCategoryMap {
  const n = stats.length;
  const topN = Math.max(1, Math.ceil(n / 3));
  const bySalary = [...stats].sort((a, b) => b.medianSalary - a.medianSalary);
  const byTrend = [...stats].sort((a, b) => b.trend6mo - a.trend6mo);
  const byPostings = [...stats].sort((a, b) => b.postings - a.postings);
  const highPaying = new Set(bySalary.slice(0, topN).map((s) => s.skill));
  const rising = new Set(byTrend.slice(0, topN).map((s) => s.skill));
  const declining = new Set(byTrend.slice(-topN).map((s) => s.skill));
  const highVolume = new Set(byPostings.slice(0, topN).map((s) => s.skill));
  const avgRemote = n > 0 ? stats.reduce((sum, s) => sum + s.remoteShare, 0) / n : 0;

  const result: SkillCategoryMap = {};
  for (const s of stats) {
    const labels: CategoryLabel[] = [];
    if (highPaying.has(s.skill)) labels.push("High-paying");
    if (rising.has(s.skill)) labels.push("Rising");
    else if (declining.has(s.skill)) labels.push("Declining");
    if (s.remoteShare > avgRemote && labels.length < 2) labels.push("Remote-friendly");
    if (highVolume.has(s.skill) && labels.length < 2) labels.push("High-volume");
    result[s.skill] = labels.slice(0, 2);
  }
  return result;
}
