import { NextResponse } from "next/server";
import type { QuerySpec } from "@/lib/schema";
import { getSkillStats } from "@/lib/data";
import { executeQuerySpec } from "@/lib/query";
import { resolveProvider } from "@/lib/ai";
import { AiRequestError, SpecValidationError, generateQuerySpec } from "@/lib/querySpec";

/**
 * POST /api/filter-skills — natural-language filtering for the
 * persistent skills table on the dashboard (distinct from /api/ask,
 * which spawns a new Q&A card). One AI call only: question -> QuerySpec
 * (shared with /api/ask via src/lib/querySpec.ts) -> executed against
 * live data -> filtered/sorted rows. No insight or follow-up call, no
 * conversation history — each filter is an independent, fresh view of
 * the table.
 */
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
  try {
    spec = await generateQuerySpec(question, provider);
  } catch (err) {
    if (err instanceof AiRequestError) {
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }
    if (err instanceof SpecValidationError) {
      return NextResponse.json(
        { error: "Couldn't understand that filter. Try rephrasing." },
        { status: 422 }
      );
    }
    throw err;
  }

  const stats = await getSkillStats();
  const result = executeQuerySpec(spec, stats);

  return NextResponse.json({ spec, rows: result.rows, mock: !provider });
}
