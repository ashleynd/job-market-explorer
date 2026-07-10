import AskBar from "@/components/AskBar";
import SkillsTable from "@/components/SkillsTable";
import StatCards from "@/components/StatCards";
import { getTotals } from "@/lib/data";

export default function Home() {
  const { snapshotDate } = getTotals();

  return (
    <main>
      <h1>Job market explorer</h1>
      <p className="subtitle">
        Ask questions about the tech job market in plain English. Data snapshot:{" "}
        {snapshotDate} (demo data).
      </p>
      <AskBar />
      <StatCards />
      <SkillsTable />
    </main>
  );
}
