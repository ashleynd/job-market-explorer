import { z } from "zod";
import { QuerySpecSchema, type QuerySpec } from "@/lib/schema";
import { getSkillNames } from "@/lib/data";
import { askModel, type Provider } from "@/lib/ai";

/**
 * Shared question -> QuerySpec pipeline, used by both /api/ask
 * (conversational, history-aware) and /api/filter-skills (one-shot,
 * no history, no insight/follow-up call). Keeps the prompt/validation
 * logic in one place rather than duplicated per route.
 */

export const MOCK_SPEC: QuerySpec = {
  metric: "postings",
  groupBy: "skill",
  filters: {},
  visualization: "table",
};

export const AskHistorySchema = z
  .array(z.object({ question: z.string().max(300), spec: QuerySpecSchema }))
  .max(3);
export type AskHistory = z.infer<typeof AskHistorySchema>;

export class AiRequestError extends Error {}
export class SpecValidationError extends Error {}

export async function generateQuerySpec(
  question: string,
  provider: Provider | null,
  history: AskHistory = []
): Promise<QuerySpec> {
  if (!provider) return MOCK_SPEC;

  const system = [
    "You translate questions about the tech job market into a JSON QuerySpec.",
    `Available skills: ${getSkillNames().join(", ")}.`,
    "Respond with ONLY a valid JSON object, no prose, matching this shape:",
    `{"metric":"postings"|"medianSalary"|"remoteShare","groupBy":"skill","filters":{"skills"?:string[],"remoteOnly"?:boolean},"visualization":"table"|"barChart"|"statCard"}`,
    "groupBy must always be \"skill\" — month-over-month history isn't available.",
    "visualization must be table, barChart, or statCard — lineChart isn't supported (no time-series data).",
    "Do not include a months filter — it isn't supported.",
    ...buildHistoryPromptLines(history),
  ].join("\n");

  let text: string;
  try {
    text = await askModel(provider, system, question);
  } catch {
    throw new AiRequestError("AI request failed");
  }

  const parsed = QuerySpecSchema.safeParse(extractJson(text));
  if (!parsed.success) {
    throw new SpecValidationError("Couldn't understand that question. Try rephrasing.");
  }
  return parsed.data;
}

function buildHistoryPromptLines(history: AskHistory): string[] {
  if (history.length === 0) return [];
  const turns = history
    .map((turn, i) => `${i + 1}. Q: "${turn.question}" -> ${JSON.stringify(turn.spec)}`)
    .join("\n");
  return [
    "Prior turns in this conversation (most recent last):",
    turns,
    "The new question may be a refinement of the most recent prior spec (e.g. \"also show Java\", \"now only remote\", \"what about salary instead\") — adjust that spec rather than starting over. If the new question is unrelated, ignore history and answer fresh. Merge filters.skills (add/remove) rather than discarding it outright when the user references \"that\" or \"those\".",
  ];
}

export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
