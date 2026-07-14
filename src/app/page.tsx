import AskBar from "@/components/AskBar";
import SkillsTable from "@/components/SkillsTable";
import StatCards from "@/components/StatCards";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-center text-2xl font-semibold">Job market explorer</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Ask questions about the tech job market in plain English. Live data from the Adzuna
        API, fetched on every page load.
      </p>
      <AskBar />
      <StatCards />
      <SkillsTable />
    </main>
  );
}
