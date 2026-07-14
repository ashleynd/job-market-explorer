"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { QueryResult } from "@/lib/schema";

const SUGGESTIONS = [
  "Is React demand growing or shrinking?",
  "Which skills pay the most?",
  "What share of TypeScript jobs are remote?",
];

interface AskResponse {
  result: QueryResult;
  insight: string;
}

function formatMetric(metric: QueryResult["metric"], value: number): string {
  if (metric === "medianSalary") return `$${Math.round(value / 1000)}K`;
  if (metric === "remoteShare") return `${Math.round(value * 100)}%`;
  return value.toLocaleString("en-US");
}

function ResultView({ result }: { result: QueryResult }) {
  if (result.rows.length === 0) {
    return (
      <Card className="mb-6 px-4 py-6 text-center text-sm text-muted-foreground">
        No matching skills found.
      </Card>
    );
  }

  if (result.visualization === "statCard") {
    const top = result.rows[0];
    return (
      <Card className="mb-6">
        <CardContent>
          <p className="mb-1 text-xs text-muted-foreground">{top.skill}</p>
          <p className="text-2xl font-semibold">{formatMetric(result.metric, top[result.metric])}</p>
        </CardContent>
      </Card>
    );
  }

  // "table" and "barChart" (no chart library integrated yet — see
  // CLAUDE.md task #2) both render as a table for now.
  return (
    <Card className="mb-6 px-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Skill</TableHead>
            <TableHead>Postings</TableHead>
            <TableHead>7-day trend</TableHead>
            <TableHead>Median salary</TableHead>
            <TableHead>Remote</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((r) => (
            <TableRow key={r.skill}>
              <TableCell className="font-medium">{r.skill}</TableCell>
              <TableCell>{r.postings.toLocaleString("en-US")}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    r.trend6mo >= 0
                      ? "border-success/30 text-success"
                      : "border-destructive/30 text-destructive"
                  }
                >
                  {r.trend6mo >= 0 ? "▲" : "▼"} {Math.abs(Math.round(r.trend6mo * 100))}%
                </Badge>
              </TableCell>
              <TableCell>${Math.round(r.medianSalary / 1000)}K</TableCell>
              <TableCell>{Math.round(r.remoteShare * 100)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export default function AskBar() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try rephrasing.");
      } else {
        setResponse({ result: data.result, insight: data.insight });
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) ask(question.trim());
        }}
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask the market anything — e.g. Is React demand growing?"
          maxLength={300}
          aria-label="Ask a question about the job market"
          className="h-10 flex-1"
        />
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Thinking…" : "Ask"}
        </Button>
      </form>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <Button
            key={s}
            type="button"
            variant="outline"
            size="xs"
            className="rounded-full text-muted-foreground"
            onClick={() => {
              setQuestion(s);
              ask(s);
            }}
          >
            {s}
          </Button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
          {error}
        </div>
      )}

      {response && (
        <>
          {response.insight && (
            <div className="mb-6 rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
              ✦ {response.insight}
            </div>
          )}
          <ResultView result={response.result} />
        </>
      )}
    </section>
  );
}
