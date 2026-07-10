import { NextResponse } from "next/server";
import { QuerySpecSchema, type QuerySpec } from "@/lib/schema";
import { getSkillNames } from "@/lib/data";
import { askModel, resolveProvider } from "@/lib/ai";

/**
 * POST /api/ask — the AI query pipeline.
 * question (natural language) → AI provider → QuerySpec JSON → Zod validation.
 * The UI only ever receives a validated QuerySpec, never free text.
 *
 * Without any API key set, returns a mock spec so the app works out
 * of the box. Provider selection lives in src/lib/ai.ts.
 */

const MOCK_SPEC: QuerySpec = {
  metric: "postings",
  groupBy: "skill",
  filters: {},
  visualization: "table",
  insight:
    "Mock response — add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY to .env.local to enable live AI queries.",
};

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
  if (!provider) {
    return NextResponse.json({ spec: MOCK_SPEC, mock: true });
  }

  const system = [
    "You translate questions about the tech job market into a JSON QuerySpec.",
    `Available skills: ${getSkillNames().join(", ")}.`,
    "Respond with ONLY a valid JSON object, no prose, matching this shape:",
    `{"metric":"postings"|"medianSalary"|"remoteShare","groupBy":"skill"|"month","filters":{"skills"?:string[],"remoteOnly"?:boolean,"months"?:number},"visualization":"table"|"lineChart"|"barChart"|"statCard","insight"?:string}`,
    "insight is a one-sentence, data-grounded observation (max 300 chars).",
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

  return NextResponse.json({ spec: parsed.data });
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
