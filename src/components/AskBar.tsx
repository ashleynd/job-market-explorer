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
import type { QuerySpec, QueryResult } from "@/lib/schema";

const SUGGESTIONS = [
  "Is React demand growing or shrinking?",
  "Which skills pay the most?",
  "What share of TypeScript jobs are remote?",
];

const MAX_HISTORY_TURNS = 3;

interface Exchange {
  id: string;
  question: string;
  spec: QuerySpec;
  result: QueryResult;
  insight: string;
  followUps: string[];
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

function ExchangeView({ exchange }: { exchange: Exchange }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-medium text-muted-foreground">{exchange.question}</p>
      {exchange.insight && (
        <div className="mb-3 rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
          ✦ {exchange.insight}
        </div>
      )}
      <ResultView result={exchange.result} />
    </div>
  );
}

export default function AskBar() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string, { carryHistory }: { carryHistory: boolean }) {
    setLoading(true);
    setError(null);
    try {
      const history = carryHistory
        ? exchanges
            .slice(0, MAX_HISTORY_TURNS)
            .reverse()
            .map(({ question, spec }) => ({ question, spec }))
        : [];
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try rephrasing.");
      } else {
        setExchanges((prev) => [
          {
            id: crypto.randomUUID(),
            question: q,
            spec: data.spec,
            result: data.result,
            insight: data.insight,
            followUps: data.followUps ?? [],
          },
          ...prev,
        ]);
        setQuestion("");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const chips = exchanges.length === 0 ? SUGGESTIONS : exchanges[0].followUps;

  return (
    <section>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) ask(question.trim(), { carryHistory: false });
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

      {chips.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {chips.map((s) => (
            <Button
              key={s}
              type="button"
              variant="outline"
              size="xs"
              className="rounded-full text-muted-foreground"
              onClick={() => ask(s, { carryHistory: exchanges.length > 0 })}
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
          {error}
        </div>
      )}

      {exchanges.map((exchange) => (
        <ExchangeView key={exchange.id} exchange={exchange} />
      ))}
    </section>
  );
}
