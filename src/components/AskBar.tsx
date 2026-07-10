"use client";

import { useState } from "react";
import type { QuerySpec } from "@/lib/schema";

const SUGGESTIONS = [
  "Is React demand growing or shrinking?",
  "Which skills pay the most?",
  "What share of TypeScript jobs are remote?",
];

export default function AskBar() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuerySpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    setLoading(true);
    setError(null);
    setResult(null);
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
        setResult(data.spec);
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
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) ask(question.trim());
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask the market anything — e.g. Is React demand growing?"
          maxLength={300}
          aria-label="Ask a question about the job market"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQuestion(s);
              ask(s);
            }}
            style={{
              fontSize: "0.75rem",
              padding: "3px 12px",
              border: "1px solid var(--border)",
              borderRadius: 12,
              background: "var(--surface)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <div className="insight">{error}</div>}

      {result && (
        <>
          {result.insight && <div className="insight">✦ {result.insight}</div>}
          {/* TODO(agent-A/agent-C): execute the QuerySpec against local data
              and render the matching visualization (table/chart/statCard).
              For now we show the raw validated spec. */}
          <div className="card">
            <pre style={{ margin: 0, fontSize: "0.8rem", overflowX: "auto" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </>
      )}
    </section>
  );
}
