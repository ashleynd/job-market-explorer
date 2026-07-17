"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

const DURATION_MS = 700;

type FormatType = "number" | "salary" | "percent";

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function formatValue(n: number, formatType: FormatType): string {
  if (formatType === "salary") return `$${Math.round(n / 1000)}K`;
  if (formatType === "percent") return `${n}%`;
  return n.toLocaleString("en-US");
}

/** Animates a numeric stat counting up from 0 on mount. Non-numeric
 * stats (e.g. a skill name) skip the count-up and just render as-is.
 * `formatType` is a serializable descriptor (not a function) since this
 * is a client component rendered from an async server component. */
export function AnimatedStat({
  label,
  value,
  formatType = "number",
  delayMs = 0,
}: {
  label: string;
  value: number | string;
  formatType?: FormatType;
  delayMs?: number;
}) {
  const isNumeric = typeof value === "number";
  const [display, setDisplay] = useState(isNumeric ? 0 : value);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!isNumeric) return;
    const target = value;
    const start = performance.now() + delayMs;

    function tick(now: number) {
      const elapsed = now - start;
      if (elapsed < 0) {
        frame.current = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / DURATION_MS, 1);
      setDisplay(Math.round(target * easeOutQuad(progress)));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isNumeric, delayMs]);

  const shown = typeof display === "number" ? formatValue(display, formatType) : display;

  return (
    <Card
      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <CardContent>
        <p className="mb-1 text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{shown}</p>
      </CardContent>
    </Card>
  );
}
