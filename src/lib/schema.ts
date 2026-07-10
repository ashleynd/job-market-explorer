import { z } from "zod";

/**
 * QuerySpec is the shared contract of the whole app.
 * The AI never returns free text to the UI — it returns a QuerySpec,
 * which the frontend executes against local data and renders as
 * structured UI (table, chart, or stat card).
 *
 * Define changes here FIRST before touching the API route or UI.
 */
export const QuerySpecSchema = z.object({
  metric: z.enum(["postings", "medianSalary", "remoteShare"]),
  groupBy: z.enum(["skill", "month"]),
  filters: z
    .object({
      skills: z.array(z.string()).optional(),
      remoteOnly: z.boolean().optional(),
      months: z.number().int().min(1).max(24).optional(),
    })
    .default({}),
  visualization: z.enum(["table", "lineChart", "barChart", "statCard"]),
  insight: z.string().max(300).optional(),
});

export type QuerySpec = z.infer<typeof QuerySpecSchema>;

export interface SkillStat {
  skill: string;
  postings: number;
  trend6mo: number;
  medianSalary: number;
  remoteShare: number;
}
