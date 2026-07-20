import AskBar from "@/components/AskBar";
import SkillCategories from "@/components/SkillCategories";
import SkillsTable from "@/components/SkillsTable";
import StatCards from "@/components/StatCards";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-1 flex items-start justify-between gap-4">
        <div className="flex-1" />
        <h1 className="flex-1 text-center text-2xl font-semibold">Job market explorer</h1>
        <div className="flex flex-1 justify-end">
          <ThemeToggle />
        </div>
      </div>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Ask questions about these skillsets in the current market in plain English. Live data from the Adzuna
        API, fetched on every page load.
      </p>
      <AskBar />
      <StatCards />
      <SkillCategories />
      <SkillsTable />
    </main>
  );
}
