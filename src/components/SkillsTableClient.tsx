"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SkillStat } from "@/lib/schema";

function SkillRows({ rows }: { rows: SkillStat[] }) {
  return (
    <>
      {rows.map((s) => (
        <TableRow key={s.skill}>
          <TableCell className="font-medium">{s.skill}</TableCell>
          <TableCell>{s.postings.toLocaleString("en-US")}</TableCell>
          <TableCell>
            <Badge
              variant="outline"
              className={
                s.trend6mo >= 0
                  ? "border-success/30 text-success"
                  : "border-destructive/30 text-destructive"
              }
            >
              {s.trend6mo >= 0 ? "▲" : "▼"} {Math.abs(Math.round(s.trend6mo * 100))}%
            </Badge>
          </TableCell>
          <TableCell>${Math.round(s.medianSalary / 1000)}K</TableCell>
          <TableCell>{Math.round(s.remoteShare * 100)}%</TableCell>
        </TableRow>
      ))}
    </>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <TableRow key={i}>
          <TableCell colSpan={5}>
            <div className="h-6 w-full animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function SkillsTableClient({ initialStats }: { initialStats: SkillStat[] }) {
  const [rows, setRows] = useState(initialStats);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyFilter(q: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/filter-skills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try rephrasing.");
      } else {
        setRows(data.rows);
        setFiltered(true);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setRows(initialStats);
    setFiltered(false);
    setQuery("");
    setError(null);
  }

  return (
    <div className="mb-6">
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) applyFilter(query.trim());
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter skills — e.g. remote-friendly, high-paying skills"
          maxLength={300}
          aria-label="Filter the skills table"
          className="h-9 flex-1"
        />
        <Button type="submit" disabled={loading} size="default">
          {loading ? "Filtering…" : "Filter"}
        </Button>
        {filtered && (
          <Button type="button" variant="outline" onClick={reset}>
            Show all skills
          </Button>
        )}
      </form>

      {error && (
        <div className="mb-3 rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
          {error}
        </div>
      )}

      <Card className="px-4">
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
          <TableBody>{loading ? <SkeletonRows /> : <SkillRows rows={rows} />}</TableBody>
        </Table>
      </Card>
    </div>
  );
}
