import { AnimatedStat } from "@/components/AnimatedStat";
import { getTotals } from "@/lib/data";

export default async function StatCards() {
  const { totalPostings, medianSalary, remoteShare, topTrend } = await getTotals();

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <AnimatedStat label="Postings analyzed" value={totalPostings} delayMs={0} />
      <AnimatedStat
        label="Median salary"
        value={medianSalary}
        formatType="salary"
        delayMs={75}
      />
      <AnimatedStat
        label="Remote share"
        value={Math.round(remoteShare * 100)}
        formatType="percent"
        delayMs={150}
      />
      <AnimatedStat label="Fastest growing" value={topTrend?.skill ?? "—"} delayMs={225} />
    </div>
  );
}
