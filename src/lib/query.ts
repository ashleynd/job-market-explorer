import type { QuerySpec, QueryResult, SkillStat } from "@/lib/schema";

/**
 * Executes a validated QuerySpec against live SkillStat[] data.
 *
 * groupBy is always resolved to "skill" — there's no time-series data
 * source yet, so "month" grouping has nothing real to group by.
 * visualization "lineChart" is coerced to "barChart" for the same
 * reason (see QueryResult in schema.ts).
 *
 * filters.remoteOnly is interpreted as "skills with meaningful remote
 * presence" (remoteShare >= REMOTE_THRESHOLD) rather than adjusting
 * postings counts — we only have per-skill aggregates, not per-listing
 * remote flags, so we filter on the real remoteShare field instead of
 * fabricating an adjusted number.
 */

const REMOTE_THRESHOLD = 0.25;

export function executeQuerySpec(spec: QuerySpec, allStats: SkillStat[]): QueryResult {
  let rows = allStats;

  if (spec.filters.skills && spec.filters.skills.length > 0) {
    const wanted = new Set(spec.filters.skills.map((s) => s.toLowerCase()));
    const filtered = rows.filter((r) => wanted.has(r.skill.toLowerCase()));
    if (filtered.length > 0) rows = filtered;
  }

  if (spec.filters.remoteOnly) {
    const filtered = rows.filter((r) => r.remoteShare >= REMOTE_THRESHOLD);
    if (filtered.length > 0) rows = filtered;
  }

  rows = [...rows].sort((a, b) => b[spec.metric] - a[spec.metric]);

  const visualization: QueryResult["visualization"] =
    spec.visualization === "lineChart" ? "barChart" : spec.visualization;

  return { metric: spec.metric, visualization, rows };
}
