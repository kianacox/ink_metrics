"use client";

import { useEffect, useState } from "react";

const ROWS = [
  {
    label: "Gross income",
    display: "£5,800",
    pct: 100,
    barClass: "bg-foreground/10",
    labelClass: "text-muted-foreground",
    valueClass: "text-foreground font-medium",
    dividerBefore: false,
    emphasize: false,
    note: null as string | null,
  },
  {
    label: "Chair rent",
    display: "−£960",
    pct: 16.6,
    barClass: "bg-amber-400/60 dark:bg-amber-500/50",
    labelClass: "text-muted-foreground",
    valueClass: "text-amber-700 dark:text-amber-400 font-medium",
    dividerBefore: false,
    emphasize: false,
    note: null as string | null,
  },
  {
    label: "Supplies & expenses",
    display: "−£600",
    pct: 10.3,
    barClass: "bg-secondary/50",
    labelClass: "text-muted-foreground",
    valueClass: "text-muted-foreground font-medium",
    dividerBefore: false,
    emphasize: false,
    note: null as string | null,
  },
  {
    label: "Take-home",
    display: "£4,240",
    pct: 73.1,
    barClass: "bg-primary",
    labelClass: "text-foreground font-semibold",
    valueClass: "text-primary font-bold",
    dividerBefore: true,
    emphasize: true,
    note: "73% of gross",
  },
] as const;

export function RevenueChart() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-6 sm:p-8 lg:p-10">
      <div className="space-y-5">
        {ROWS.map((row, i) => (
          <div key={row.label}>
            {row.dividerBefore && (
              <div className="mb-5 border-t border-border" />
            )}
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className={`text-sm ${row.labelClass}`}>{row.label}</span>
              <div className="flex items-center gap-3">
                {row.note && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {row.note}
                  </span>
                )}
                <span className={`text-sm tabular-nums ${row.valueClass}`}>
                  {row.display}
                </span>
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
              <div
                className={`h-full rounded-full transition-all ease-out ${row.barClass}`}
                style={{
                  width: ready ? `${row.pct}%` : "0%",
                  transitionDuration: "700ms",
                  transitionDelay: `${i * 110}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs italic text-muted-foreground/60">
        Sample data — your real breakdown, live.
      </p>
    </div>
  );
}
