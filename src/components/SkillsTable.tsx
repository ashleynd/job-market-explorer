import SkillsTableClient from "@/components/SkillsTableClient";
import { getSkillStats } from "@/lib/data";

export default async function SkillsTable() {
  const stats = await getSkillStats();
  return <SkillsTableClient initialStats={stats} />;
}
