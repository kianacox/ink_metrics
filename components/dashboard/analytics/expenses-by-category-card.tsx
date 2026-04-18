"use client";

import { formatMinorAsCurrency } from "@/lib/dashboard-analytics";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expenses/models";
import type { ExpensesByCategoryStat } from "@/lib/dashboard-analytics/models";

const CATEGORY_COLORS: Record<string, string> = {
  ink: "bg-indigo-500",
  cartridges: "bg-amber-500",
  needles: "bg-rose-500",
  machines: "bg-cyan-500",
  other_equipment: "bg-violet-500",
  travel: "bg-emerald-500",
  miscellaneous: "bg-slate-400",
};

interface ExpensesByCategoryCardContentProps {
  data: ExpensesByCategoryStat;
  currencyCode: string;
}

export function ExpensesByCategoryCardContent({
  data,
  currencyCode,
}: ExpensesByCategoryCardContentProps) {
  const { items, totalMinor } = data;

  const sortedItems = [...items].sort((a, b) => {
    if (a.totalMinor !== b.totalMinor) return b.totalMinor - a.totalMinor;
    return a.category.localeCompare(b.category);
  });

  const maxMinor = Math.max(...items.map((i) => i.totalMinor), 1);

  return (
    <div className="space-y-3 text-sm">
      <ul className="space-y-2.5" aria-label="Expenses by category">
        {sortedItems.map((item) => {
          const barWidth =
            item.totalMinor === 0 ? 0 : Math.max((item.totalMinor / maxMinor) * 100, 6);
          const colorClass = CATEGORY_COLORS[item.category] ?? "bg-muted-foreground";
          const label =
            EXPENSE_CATEGORY_LABELS[item.category as keyof typeof EXPENSE_CATEGORY_LABELS] ??
            item.category.replaceAll("_", " ");
          const isZero = item.totalMinor === 0;

          return (
            <li key={item.category}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${isZero ? "bg-muted" : colorClass}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`truncate ${isZero ? "text-muted-foreground/50" : "text-muted-foreground"}`}
                  >
                    {label}
                  </span>
                </div>
                <span className={`shrink-0 ${isZero ? "text-muted-foreground/50" : "font-medium"}`}>
                  {formatMinorAsCurrency(item.totalMinor, currencyCode)}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted/60"
                aria-label={`${label} expense bar`}
                role="img"
              >
                <div
                  className={`h-full rounded-full ${isZero ? "" : colorClass}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border/60 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold text-foreground" aria-label="Total expenses">
            {formatMinorAsCurrency(totalMinor, currencyCode)}
          </span>
        </div>
      </div>
    </div>
  );
}
