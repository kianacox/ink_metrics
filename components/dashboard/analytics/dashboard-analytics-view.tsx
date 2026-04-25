"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { AnalyticsCard } from "@/components/dashboard/analytics/analytics-card";
import { ExpensesByCategoryCardContent } from "@/components/dashboard/analytics/expenses-by-category-card";
import { Button, ErrorState } from "@/components/ui";
import {
  formatMinorAsCurrency,
  formatPercentage,
  type DashboardAnalyticsResponse,
} from "@/lib/dashboard-analytics";
import { useSessionPreferences } from "@/components/dashboard/sessions/hooks/use-session-preferences";
import { Info, X } from "lucide-react";

const TAKE_HOME_COMPARISON_ITEMS = [
  {
    key: "gross" as const,
    label: "Gross",
    colorClassName: "bg-chart-2",
  },
  {
    key: "paidToStudio" as const,
    label: "Paid to studio",
    colorClassName: "bg-chart-4",
  },
  {
    key: "totalExpenses" as const,
    label: "Expenses",
    colorClassName: "bg-chart-5",
  },
  {
    key: "net" as const,
    label: "Total Take-Home",
    colorClassName: "bg-gold",
  },
];

interface TakeHomeComparisonItem {
  key: "gross" | "paidToStudio" | "totalExpenses" | "net";
  label: string;
  value: number;
  colorClassName: string;
  widthPct: number;
  pctOfGross: number;
}

function buildTakeHomeComparisonItems(
  analytics: DashboardAnalyticsResponse | null,
): TakeHomeComparisonItem[] {
  const valuesByKey = {
    gross: analytics?.takeHome.grossMinor ?? 0,
    paidToStudio: analytics?.takeHome.paidToStudioMinor ?? 0,
    totalExpenses: analytics?.takeHome.totalExpensesMinor ?? 0,
    net: analytics?.takeHome.netMinor ?? 0,
  };
  const grossValue = valuesByKey.gross;
  const maxAbsValue = Math.max(...Object.values(valuesByKey).map((value) => Math.abs(value)), 1);

  return TAKE_HOME_COMPARISON_ITEMS.map((item) => {
    const value = valuesByKey[item.key];
    const widthPct = Math.max((Math.abs(value) / maxAbsValue) * 100, value === 0 ? 0 : 8);
    const pctOfGross =
      item.key === "gross"
        ? 100
        : Math.round((Math.abs(value) / Math.max(grossValue, 1)) * 100);
    return {
      ...item,
      value,
      widthPct,
      pctOfGross,
    };
  });
}

function hasAnyMetricData(analytics: DashboardAnalyticsResponse): boolean {
  if (
    analytics.takeHome.grossMinor !== 0 ||
    analytics.takeHome.paidToStudioMinor !== 0 ||
    analytics.takeHome.totalExpensesMinor !== 0 ||
    analytics.takeHome.netMinor !== 0
  ) {
    return true;
  }

  if (
    analytics.retention.numerator !== 0 ||
    analytics.retention.denominator !== 0 ||
    analytics.retention.rate !== 0
  ) {
    return true;
  }

  if (
    analytics.averageProfitPerSession.valueMinor !== 0 ||
    analytics.averageProfitPerSession.sessionCount !== 0
  ) {
    return true;
  }

  if (analytics.hoursTattooing.totalMinutes !== 0 || analytics.hoursTattooing.totalHours !== 0) {
    return true;
  }

  if (analytics.expensesByCategory.totalMinor !== 0) {
    return true;
  }

  return analytics.expensesByCategory.items.some((item) => item.totalMinor !== 0);
}

export function DashboardAnalyticsView() {
  const retentionInfoTitleId = useId();
  const { defaultCurrency: effectiveCurrencyCode, ensureLoaded } = useSessionPreferences();
  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetentionInfoOpen, setIsRetentionInfoOpen] = useState(false);

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/analytics?month=current", {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error("Could not load dashboard analytics.");
      }

      const payload = (await response.json()) as DashboardAnalyticsResponse;
      setAnalytics(payload);
    } catch {
      setError("Could not load dashboard analytics.");
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!isRetentionInfoOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRetentionInfoOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRetentionInfoOpen]);

  const cardState = useMemo(() => {
    if (isLoading) {
      return "loading" as const;
    }

    if (!analytics || !hasAnyMetricData(analytics)) {
      return "empty" as const;
    }

    return "ready" as const;
  }, [analytics, isLoading]);
  const takeHomeComparisonItems = useMemo(
    () => buildTakeHomeComparisonItems(analytics),
    [analytics],
  );

  return (
    <section className="flex flex-col gap-4">
      <div>
        {isLoading ? (
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        ) : (
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {(analytics?.monthLabel ?? "This month")} Performance
          </h1>
        )}
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Your monthly business snapshot uses your reporting timezone and updates
          as you log sessions and expenses.
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void loadAnalytics()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnalyticsCard
            index={0}
            title="Take-home summary"
            description="Gross, studio deductions, expenses, and net."
            state={cardState}
          >
            <div className="space-y-3 text-sm">
              {takeHomeComparisonItems.map((item) => {
                const isNet = item.key === "net";
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <p className={isNet ? "font-bold text-foreground text-base" : "text-muted-foreground"}>
                          {item.label}
                        </p>
                        <span className={isNet ? "text-xs font-semibold text-foreground" : "text-xs text-muted-foreground"}>
                          {item.pctOfGross}%
                        </span>
                      </div>
                      <p className="font-semibold">
                        {formatMinorAsCurrency(item.value, effectiveCurrencyCode)}
                      </p>
                    </div>
                    <div
                      className={`${isNet ? "h-3" : "h-2"} overflow-hidden rounded-full bg-muted/70`}
                      aria-label={`${item.label} comparison bar`}
                      role="img"
                    >
                      <div
                        className={`h-full rounded-full ${item.colorClassName}`}
                        style={{ width: `${item.widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </AnalyticsCard>

          <AnalyticsCard
            index={1}
            title="Lifetime client retention rate"
            description="Clients who have come back at least once."
            state={cardState}
            headerAction={(
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-mr-1 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                aria-label="How client retention is calculated"
                onClick={() => setIsRetentionInfoOpen(true)}
              >
                <Info aria-hidden="true" className="size-4" />
              </Button>
            )}
          >
            <div className="space-y-2 text-sm">
              <p className="text-2xl font-semibold text-foreground">
                {formatPercentage(analytics?.retention.rate ?? 0)}
              </p>
              <p className="text-muted-foreground">
                {analytics?.retention.numerator ?? 0} of {analytics?.retention.denominator ?? 0}{" "}
                clients have returned.
              </p>
            </div>
          </AnalyticsCard>

          <AnalyticsCard
            index={2}
            title="Average profit per session"
            description="Net take-home divided by session count."
            state={cardState}
          >
            <div className="space-y-2 text-sm">
              <p className="text-2xl font-semibold text-foreground">
                {formatMinorAsCurrency(
                  analytics?.averageProfitPerSession.valueMinor ?? 0,
                  effectiveCurrencyCode,
                )}
              </p>
              <p className="text-muted-foreground">
                Sessions this month: {analytics?.averageProfitPerSession.sessionCount ?? 0}
              </p>
            </div>
          </AnalyticsCard>

          <AnalyticsCard
            index={3}
            title="Expenses by category"
            description="Monthly spend rollup by expense category."
            state={cardState}
          >
            {analytics ? (
              <ExpensesByCategoryCardContent
                data={analytics.expensesByCategory}
                currencyCode={effectiveCurrencyCode}
              />
            ) : null}
          </AnalyticsCard>
        </div>
      )}

      {isRetentionInfoOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setIsRetentionInfoOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl border border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-xl sm:rounded-xl sm:px-6 sm:pb-6 sm:pt-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={retentionInfoTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id={retentionInfoTitleId} className="text-base font-semibold text-foreground sm:text-lg">
                How client retention is calculated
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label="Close retention calculation details"
                onClick={() => setIsRetentionInfoOpen(false)}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                This metric is calculated across your <span className="font-semibold text-foreground">full session history</span>,
                not limited to the current month.
              </p>
              <p className="font-medium text-foreground">Formula</p>
              <p>
                Clients with 2 or more sessions (all time) / All unique clients
              </p>
              <p>
                Example: a client who had one session in January and one in April counts as a
                returning client because they have 2 or more sessions in total.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
