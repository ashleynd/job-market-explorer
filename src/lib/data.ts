import { getLiveSkillStats, getSkillNames } from "@/lib/adzuna";

export { getSkillNames };

export async function getSkillStats() {
  const skillStats = await getLiveSkillStats();
  return [...skillStats].sort((a, b) => b.postings - a.postings);
}

export async function getTotals() {
  const skillStats = await getLiveSkillStats();
  const totalPostings = skillStats.reduce((sum, s) => sum + s.postings, 0);
  const salaries = skillStats.map((s) => s.medianSalary).sort((a, b) => a - b);
  const medianSalary = salaries.length > 0 ? salaries[Math.floor(salaries.length / 2)] : 0;
  const remoteShare =
    totalPostings > 0
      ? skillStats.reduce((sum, s) => sum + s.remoteShare * s.postings, 0) / totalPostings
      : 0;
  const topTrend = [...skillStats].sort((a, b) => b.trend6mo - a.trend6mo)[0] ?? null;

  return { totalPostings, medianSalary, remoteShare, topTrend };
}
