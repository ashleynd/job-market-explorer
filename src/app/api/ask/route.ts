import { NextResponse } from "next/server";
import { QuerySpecSchema, type QuerySpec, type QueryResult } from "@/lib/schema";
import { getSkillNames, getSkillStats } from "@/lib/data";
import { executeQuerySpec } from "@/lib/query";
import { askModel, resolveProvider } from "@/lib/ai";

/**
 * POST /api/ask — the AI query pipeline.
 * question → AI provider → QuerySpec JSON (Zod-validated) → executed
 * against live Adzuna data → real result rows. A second AI call writes
 * a one-sentence insight *from the real result data*, not blind — the
 * first call never sees actual numbers, only skill names.
 * The UI only ever receives structured data, never free text.
 *
 * Without any API key set, the QuerySpec is mocked but still executed
 * against real live data, so the table renders correctly either way.
 * Provider selection lives in src/lib/ai.ts.
 */

const MOCK_SPEC: QuerySpec = {
  metric: "postings",
  groupBy: "skill",
  filters: {},
  visualization: "table",
};

const MOCK_INSIGHT =
  "Mock query — add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY to .env.local to enable live AI queries.";

export async function POST(req: Request) {
  let question: unknown;
  try {
    ({ question } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof question !== "string" || !question.trim() || question.length > 300) {
    return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  }

  const provider = resolveProvider();

  let spec: QuerySpec;
  if (!provider) {
    spec = MOCK_SPEC;
  } else {
    const system = [
      "You translate questions about the tech job market into a JSON QuerySpec.",
      `Available skills: ${getSkillNames().join(", ")}.`,
      "Respond with ONLY a valid JSON object, no prose, matching this shape:",
      `{"metric":"postings"|"medianSalary"|"remoteShare","groupBy":"skill","filters":{"skills"?:string[],"remoteOnly"?:boolean},"visualization":"table"|"barChart"|"statCard"}`,
      "groupBy must always be \"skill\" — month-over-month history isn't available.",
      "visualization must be table, barChart, or statCard — lineChart isn't supported (no time-series data).",
      "Do not include a months filter — it isn't supported.",
    ].join("\n");

    let text: string;
    try {
      text = await askModel(provider, system, question);
    } catch {
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }

    const parsed = QuerySpecSchema.safeParse(extractJson(text));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Couldn't understand that question. Try rephrasing." },
        { status: 422 }
      );
    }
    spec = parsed.data;
  }

  const stats = await getSkillStats();
  const result = executeQuerySpec(spec, stats);

  const insight = !provider
    ? MOCK_INSIGHT
    : await writeInsight(provider, question, result).catch(() => fallbackInsight(spec, result));

  return NextResponse.json({ spec, result, insight, mock: !provider });
}

async function writeInsight(
  provider: NonNullable<ReturnType<typeof resolveProvider>>,
  question: string,
  result: QueryResult
): Promise<string> {
  const system = [
    "You write a single-sentence, data-grounded insight about tech job market data.",
    "Cite specific numbers from the data provided — never invent numbers not in it.",
    "Max 300 characters. Respond with ONLY the sentence, no quotes, no markdown.",
  ].join("\n");
  const dataSummary = result.rows
    .slice(0, 8)
    .map(
      (r) =>
        `${r.skill}: ${r.postings} postings, $${r.medianSalary} median salary, ${Math.round(r.remoteShare * 100)}% remote, ${Math.round(r.trend6mo * 100)}% 7-day trend`
    )
    .join("\n");
  const text = await askModel(
    provider,
    system,
    `User asked: "${question}"\n\nData:\n${dataSummary || "(no matching skills)"}`
  );
  return text.trim().slice(0, 300);
}

function fallbackInsight(spec: QuerySpec, result: QueryResult): string {
  const top = result.rows[0];
  if (!top) return "No matching data found.";
  if (spec.metric === "medianSalary") {
    return `${top.skill} has the highest median salary at $${Math.round(top.medianSalary / 1000)}K.`;
  }
  if (spec.metric === "remoteShare") {
    return `${top.skill} has the highest remote share at ${Math.round(top.remoteShare * 100)}%.`;
  }
  return `${top.skill} leads with ${top.postings.toLocaleString("en-US")} postings.`;
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
