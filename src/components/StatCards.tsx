import { Card, CardContent } from "@/components/ui/card";
import { getTotals } from "@/lib/data";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="mb-1 text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function StatCards() {
  const { totalPostings, medianSalary, remoteShare, topTrend } = await getTotals();

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Postings analyzed" value={totalPostings.toLocaleString("en-US")} />
      <Stat label="Median salary" value={`$${Math.round(medianSalary / 1000)}K`} />
      <Stat label="Remote share" value={`${Math.round(remoteShare * 100)}%`} />
      <Stat label="Fastest growing" value={topTrend?.skill ?? "—"} />
    </div>
  );
}
