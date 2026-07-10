import type { SkillStat } from "@/lib/schema";

/**
 * Static demo snapshot — placeholder numbers so the dashboard renders
 * before live ingestion exists. Replace with real aggregates from the
 * Adzuna/Remotive ingest pipeline (see docs/spec.md §3).
 */
export const SNAPSHOT_DATE = "2026-07-01";

export const skillStats: SkillStat[] = [
  { skill: "TypeScript", postings: 4210, trend6mo: 0.14, medianSalary: 132000, remoteShare: 0.44 },
  { skill: "React", postings: 3890, trend6mo: 0.08, medianSalary: 128000, remoteShare: 0.42 },
  { skill: "Python", postings: 3550, trend6mo: 0.11, medianSalary: 135000, remoteShare: 0.38 },
  { skill: "AI/LLM integration", postings: 2340, trend6mo: 0.62, medianSalary: 151000, remoteShare: 0.51 },
  { skill: "Node.js", postings: 2100, trend6mo: 0.05, medianSalary: 126000, remoteShare: 0.40 },
  { skill: "Next.js", postings: 1480, trend6mo: 0.19, medianSalary: 130000, remoteShare: 0.46 },
  { skill: "GraphQL", postings: 1120, trend6mo: -0.03, medianSalary: 125000, remoteShare: 0.39 },
  { skill: "SQL", postings: 3980, trend6mo: 0.02, medianSalary: 118000, remoteShare: 0.33 },
];
