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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Sample month
          </p>
          <h3 className="text-xl font-bold text-foreground sm:text-2xl">
            See exactly where your money goes
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Chair rent, commissions, and expenses deducted automatically. Your
            real take-home, always up to date.
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/5 px-5 py-3 text-center sm:text-right">
          <p className="text-xs text-muted-foreground">Take-home</p>
          <p className="text-3xl font-bold text-primary">£4,240</p>
          <p className="text-xs text-muted-foreground">this month</p>
        </div>
      </div>

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
