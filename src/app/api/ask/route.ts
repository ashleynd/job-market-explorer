import { NextResponse } from "next/server";
import { z } from "zod";
import type { QuerySpec, QueryResult } from "@/lib/schema";
import { getSkillStats } from "@/lib/data";
import { executeQuerySpec } from "@/lib/query";
import { askModel, resolveProvider } from "@/lib/ai";
import {
  AskHistorySchema,
  type AskHistory,
  AiRequestError,
  SpecValidationError,
  generateQuerySpec,
  extractJson,
} from "@/lib/querySpec";

/**
 * POST /api/ask — the AI query pipeline.
 * question → AI provider → QuerySpec JSON (Zod-validated) → executed
 * against live Adzuna data → real result rows. A second AI call writes
 * a one-sentence insight plus 3 clickable follow-up questions, both
 * *from the real result data*, not blind — the first call never sees
 * actual numbers, only skill names.
 * The UI only ever receives structured data, never free text.
 *
 * Conversational refinement: the client may send `history`, the last
 * few {question, spec} turns from this browser session. Only the
 * already-Zod-validated specs are trusted — any numbers used for
 * comparison in the insight are recomputed server-side from live stats
 * via executeQuerySpec, never taken from the client.
 *
 * Without any API key set, the QuerySpec is mocked but still executed
 * against real live data, so the table renders correctly either way.
 * Provider selection lives in src/lib/ai.ts.
 */

const MOCK_INSIGHT =
  "Mock query — add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY to .env.local to enable live AI queries.";

const MOCK_FOLLOWUPS = [
  "Only remote roles",
  "Sort by median salary instead",
  "What share of these is remote?",
];

const InsightResponseSchema = z.object({
  insight: z.string().max(300),
  followUps: z.array(z.string().max(120)).min(1).max(4),
});

export async function POST(req: Request) {
  let question: unknown;
  let historyInput: unknown;
  try {
    ({ question, history: historyInput } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof question !== "string" || !question.trim() || question.length > 300) {
    return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  }

  let history: AskHistory = [];
  if (historyInput !== undefined) {
    const parsedHistory = AskHistorySchema.safeParse(historyInput);
    if (!parsedHistory.success) {
      return NextResponse.json({ error: "Invalid conversation history" }, { status: 400 });
    }
    history = parsedHistory.data.slice(-3);
  }

  const provider = resolveProvider();

  let spec: QuerySpec;
  try {
    spec = await generateQuerySpec(question, provider, history);
  } catch (err) {
    if (err instanceof AiRequestError) {
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }
    if (err instanceof SpecValidationError) {
      return NextResponse.json(
        { error: "Couldn't understand that question. Try rephrasing." },
        { status: 422 }
      );
    }
    throw err;
  }

  const stats = await getSkillStats();
  const result = executeQuerySpec(spec, stats);
  const previousResult =
    history.length > 0 ? executeQuerySpec(history[history.length - 1].spec, stats) : null;

  const { insight, followUps } = !provider
    ? { insight: MOCK_INSIGHT, followUps: MOCK_FOLLOWUPS }
    : await writeInsightAndFollowUps(provider, question, result, previousResult).catch(() => ({
        insight: fallbackInsight(spec, result),
        followUps: fallbackFollowUps(spec),
      }));

  return NextResponse.json({ spec, result, insight, followUps, mock: !provider });
}

async function writeInsightAndFollowUps(
  provider: NonNullable<ReturnType<typeof resolveProvider>>,
  question: string,
  result: QueryResult,
  previousResult: QueryResult | null
): Promise<{ insight: string; followUps: string[] }> {
  const system = [
    "You write a single-sentence, data-grounded insight about tech job market data,",
    "plus 3 short follow-up questions the user could click to continue the conversation.",
    "Cite specific numbers from the data provided — never invent numbers not in it.",
    previousResult
      ? "A previous result is included for comparison only — you may reference how the new answer differs from it, but only using numbers shown in one of the two blocks."
      : null,
    "Follow-up questions must be specific and grounded in this data — e.g. a different metric for the same skills, filtering to remote-only, adding/removing a skill for comparison. Not generic like \"tell me more\".",
    "Respond with ONLY a valid JSON object, no prose, matching this shape:",
    `{"insight":"<max 300 chars, no quotes/markdown>","followUps":["<question>","<question>","<question>"]}`,
  ]
    .filter(Boolean)
    .join("\n");
  const summarize = (r: QueryResult) =>
    r.rows
      .slice(0, 8)
      .map(
        (row) =>
          `${row.skill}: ${row.postings} postings, $${row.medianSalary} median salary, ${Math.round(row.remoteShare * 100)}% remote, ${Math.round(row.trend6mo * 100)}% 7-day trend`
      )
      .join("\n") || "(no matching skills)";
  const dataBlock = `Data:\n${summarize(result)}`;
  const previousBlock = previousResult
    ? `\n\nPrevious result (for comparison only):\n${summarize(previousResult)}`
    : "";
  const text = await askModel(
    provider,
    system,
    `User asked: "${question}"\n\n${dataBlock}${previousBlock}`
  );
  const parsed = InsightResponseSchema.safeParse(extractJson(text));
  if (!parsed.success) throw new Error("Invalid insight/follow-up response");
  return {
    insight: parsed.data.insight.trim().slice(0, 300),
    followUps: parsed.data.followUps.slice(0, 3),
  };
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

function fallbackFollowUps(spec: QuerySpec): string[] {
  const suggestions: string[] = [];
  if (spec.metric !== "medianSalary") suggestions.push("Which of these pays the most?");
  if (spec.metric !== "remoteShare") suggestions.push("What share of these is remote?");
  if (!spec.filters.remoteOnly) suggestions.push("Only remote roles");
  if (spec.metric !== "postings") suggestions.push("Which has the most postings?");
  return suggestions.slice(0, 3);
}
