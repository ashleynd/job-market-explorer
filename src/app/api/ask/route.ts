import { NextResponse } from "next/server";
import { QuerySpecSchema, type QuerySpec } from "@/lib/schema";
import { getSkillNames } from "@/lib/data";

/**
 * POST /api/ask — the AI query pipeline.
 * question (natural language) → Claude → QuerySpec JSON → Zod validation.
 * The UI only ever receives a validated QuerySpec, never free text.
 *
 * Without ANTHROPIC_API_KEY set, returns a mock spec so the app works
 * out of the box.
 */

const MOCK_SPEC: QuerySpec = {
  metric: "postings",
  groupBy: "skill",
  filters: {},
  visualization: "table",
  insight:
    "Mock response — add ANTHROPIC_API_KEY to .env.local to enable live AI queries.",
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ spec: MOCK_SPEC, mock: true });
  }

  const system = [
    "You translate questions about the tech job market into a JSON QuerySpec.",
    `Available skills: ${getSkillNames().join(", ")}.`,
    "Respond with ONLY a valid JSON object, no prose, matching this shape:",
    `{"metric":"postings"|"medianSalary"|"remoteShare","groupBy":"skill"|"month","filters":{"skills"?:string[],"remoteOnly"?:boolean,"months"?:number},"visualization":"table"|"lineChart"|"barChart"|"statCard","insight"?:string}`,
    "insight is a one-sentence, data-grounded observation (max 300 chars).",
  ].join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system,
      messages: [{ role: "user", content: question }],
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "AI request failed" }, { status: 502 });
  }

  const data = await res.json();
  const text: string =
    data?.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";

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
