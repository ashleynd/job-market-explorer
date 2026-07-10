import { skillStats, SNAPSHOT_DATE } from "@/data/snapshot";
import type { SkillStat } from "@/lib/schema";

export function getSkillStats(): SkillStat[] {
  return [...skillStats].sort((a, b) => b.postings - a.postings);
}

export function getSkillNames(): string[] {
  return skillStats.map((s) => s.skill);
}

export function getTotals() {
  const totalPostings = skillStats.reduce((sum, s) => sum + s.postings, 0);
  const salaries = skillStats.map((s) => s.medianSalary).sort((a, b) => a - b);
  const medianSalary = salaries[Math.floor(salaries.length / 2)];
  const remoteShare =
    skillStats.reduce((sum, s) => sum + s.remoteShare * s.postings, 0) / totalPostings;
  const topTrend = [...skillStats].sort((a, b) => b.trend6mo - a.trend6mo)[0];

  return { totalPostings, medianSalary, remoteShare, topTrend, snapshotDate: SNAPSHOT_DATE };
}
