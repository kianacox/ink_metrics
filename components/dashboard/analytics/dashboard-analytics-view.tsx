"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnalyticsCard } from "@/components/dashboard/analytics/analytics-card";
import { ErrorState } from "@/components/ui";
import {
  formatHours,
  formatMinorAsCurrency,
  formatPercentage,
  type DashboardAnalyticsResponse,
} from "@/lib/dashboard-analytics";
import { DEFAULT_CURRENCY } from "@/lib/currency";

const TAKE_HOME_COMPARISON_ITEMS = [
  {
    key: "gross" as const,
    label: "Gross",
    colorClassName: "bg-emerald-500/85",
  },
  {
    key: "paidToStudio" as const,
    label: "Paid to studio",
    colorClassName: "bg-amber-500/85",
  },
  {
    key: "totalExpenses" as const,
    label: "Expenses",
    colorClassName: "bg-orange-500/85",
  },
  {
    key: "net" as const,
    label: "Net",
    colorClassName: "bg-blue-500/85",
  },
];

interface TakeHomeComparisonItem {
  key: "gross" | "paidToStudio" | "totalExpenses" | "net";
  label: string;
  value: number;
  colorClassName: string;
  widthPct: number;
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
  const maxAbsValue = Math.max(...Object.values(valuesByKey).map((value) => Math.abs(value)), 1);

  return TAKE_HOME_COMPARISON_ITEMS.map((item) => {
    const value = valuesByKey[item.key];
    const widthPct = Math.max((Math.abs(value) / maxAbsValue) * 100, value === 0 ? 0 : 8);
    return {
      ...item,
      value,
      widthPct,
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

export function DashboardAnalyticsView({
  currencyCode,
}: {
  currencyCode?: string;
}) {
  const effectiveCurrencyCode = currencyCode ?? DEFAULT_CURRENCY;
  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {(analytics?.monthLabel ?? "This month")} stats
        </h1>
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
            title="Take-home summary"
            description="Gross, studio deductions, expenses, and net."
            state={cardState}
          >
            <div className="space-y-3 text-sm">
              {takeHomeComparisonItems.map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-muted-foreground">{item.label}</p>
                    <p className="font-semibold">
                      {formatMinorAsCurrency(item.value, effectiveCurrencyCode)}
                    </p>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted/70"
                    aria-label={`${item.label} comparison bar`}
                    role="img"
                  >
                    <div
                      className={`h-full rounded-full ${item.colorClassName}`}
                      style={{ width: `${item.widthPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </AnalyticsCard>

          <AnalyticsCard
            title="Client retention rate"
            description="Repeat clients this month."
            state={cardState}
          >
            <div className="space-y-2 text-sm">
              <p className="text-2xl font-semibold text-foreground">
                {formatPercentage(analytics?.retention.rate ?? 0)}
              </p>
              <p className="text-muted-foreground">
                {analytics?.retention.numerator ?? 0} of {analytics?.retention.denominator ?? 0}{" "}
                clients returned.
              </p>
            </div>
          </AnalyticsCard>

          <AnalyticsCard
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
            title="Hours spent tattooing"
            description="Total session time across the month."
            state={cardState}
          >
            <div className="space-y-2 text-sm">
              <p className="text-2xl font-semibold text-foreground">
                {formatHours(analytics?.hoursTattooing.totalHours ?? 0)}
              </p>
              <p className="text-muted-foreground">
                Total minutes: {analytics?.hoursTattooing.totalMinutes ?? 0}
              </p>
            </div>
          </AnalyticsCard>

          <AnalyticsCard
            title="Expenses by category"
            description="Monthly spend rollup by expense category."
            state={cardState}
          >
            <div className="space-y-2 text-sm">
              <ul className="space-y-1">
                {(analytics?.expensesByCategory.items ?? []).map((item) => (
                  <li key={item.category} className="flex items-center justify-between gap-2">
                    <span className="capitalize text-muted-foreground">
                      {item.category.replaceAll("_", " ")}
                    </span>
                    <span className="font-medium">
                      {formatMinorAsCurrency(item.totalMinor, effectiveCurrencyCode)}
                    </span>
                  </li>
                ))}
              </ul>
              <p>
                Total:{" "}
                <span className="font-semibold">
                  {formatMinorAsCurrency(
                    analytics?.expensesByCategory.totalMinor ?? 0,
                    effectiveCurrencyCode,
                  )}
                </span>
              </p>
            </div>
          </AnalyticsCard>
        </div>
      )}
    </section>
  );
}
