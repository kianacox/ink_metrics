"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { DashboardAnalyticsView } from "@/components/dashboard/analytics/dashboard-analytics-view";
import { ActionsView } from "@/components/dashboard/actions/actions-view";

type DashboardTab = "actions" | "insights";

const TABS: Array<{ id: DashboardTab; label: string }> = [
  { id: "actions", label: "Actions" },
  { id: "insights", label: "Insights" },
];

interface DashboardTabsProps {
  displayName: string | null;
}

export function DashboardTabs({ displayName }: DashboardTabsProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<DashboardTab>(() =>
    searchParams.get("tab") === "insights" ? "insights" : "actions",
  );
  const [insightsMounted, setInsightsMounted] = useState(() =>
    searchParams.get("tab") === "insights",
  );

  const setTab = useCallback(
    (tab: DashboardTab) => {
      setActiveTab(tab);
      if (tab === "insights") setInsightsMounted(true);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      window.history.replaceState(null, "", `?${params.toString()}`);
    },
    [searchParams],
  );

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div
        role="tablist"
        aria-label="Dashboard sections"
        className="flex gap-1 border-b border-border"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              activeTab === tab.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="tabpanel-actions"
        aria-labelledby="tab-actions"
        hidden={activeTab !== "actions"}
      >
        <ActionsView displayName={displayName} />
      </div>

      <div
        role="tabpanel"
        id="tabpanel-insights"
        aria-labelledby="tab-insights"
        hidden={activeTab !== "insights"}
      >
        {insightsMounted ? <DashboardAnalyticsView /> : null}
      </div>
    </div>
  );
}
