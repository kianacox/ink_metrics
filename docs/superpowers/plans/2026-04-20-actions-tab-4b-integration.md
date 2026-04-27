# Actions Tab UI — PR 4b: Views + Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Actions tab into the live dashboard — fetch layer, dismiss state, URL-param tab bar, and server-side `display_name` prop.

**Architecture:** `ActionsView` is a client component that fetches `GET /api/dashboard/actions` on mount, manages the `actions` list state, handles dismiss (removes action from state, shows toast on error), and wraps the list in framer-motion `AnimatePresence` for exit animations. `DashboardTabs` is a client component that reads `?tab` from `useSearchParams` and renders either `ActionsView` or `DashboardAnalyticsView`. The dashboard server component fetches `display_name` from the profiles table and passes it as a prop.

**Tech Stack:** Next.js App Router (server + client components), framer-motion, shadcn, Tailwind

**Depends on:** PR 4a merged (`Action` type, `ActionCard`, state components importable)

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `components/dashboard/actions/actions-view.tsx` | Create | Fetch, state machine, dismiss handler, AnimatePresence list |
| `components/dashboard/dashboard-tabs.tsx` | Create | URL-param tab bar, tabpanels |
| `app/dashboard/page.tsx` | Modify | Fetch `display_name`, render `<DashboardTabs>` in Suspense |

---

## Task 1: ActionsView

Manages fetch, dismiss, and the animated card list. Greeting uses `displayName` prop from the server component (no extra fetch).

**Files:**
- Create: `components/dashboard/actions/actions-view.tsx`

- [ ] **Step 1: Create actions-view.tsx**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ActionCard, type Action } from "./action-card";
import { ActionCardSkeleton } from "./action-card-skeleton";
import { ActionsEmptyState } from "./actions-empty-state";
import { ActionsErrorState } from "./actions-error-state";

interface ActionsViewProps {
  displayName: string | null;
}

export function ActionsView({ displayName }: ActionsViewProps) {
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await fetch("/api/dashboard/actions");
      if (!res.ok) throw new Error("fetch failed");
      const { actions: fetched } = (await res.json()) as { actions: Action[] };
      setActions(fetched);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const handleDismiss = useCallback((actionId: string) => {
    setActions((prev) => prev.filter((a) => a.actionId !== actionId));
  }, []);

  const handleDismissError = useCallback(() => {
    setToast("Couldn't dismiss action. Please try again.");
    setTimeout(() => setToast(null), 3000);
  }, []);

  const greeting = `Hey ${displayName ?? "there"}, here's who needs a message:`;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {toast !== null && (
        <div
          className="fixed right-4 top-4 z-50 max-w-xs rounded-md border border-border bg-background px-4 py-3 text-sm shadow-lg sm:right-6 sm:top-6"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-4" aria-label="Loading actions">
          <ActionCardSkeleton />
          <ActionCardSkeleton />
          <ActionCardSkeleton />
        </div>
      )}

      {!isLoading && hasError && <ActionsErrorState onRetry={fetchActions} />}

      {!isLoading && !hasError && actions.length === 0 && <ActionsEmptyState />}

      {!isLoading && !hasError && actions.length > 0 && (
        <>
          <p className="mb-4 text-sm font-medium text-foreground">{greeting}</p>
          <div className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {actions.map((action) => (
                <motion.div
                  key={action.actionId}
                  layout
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <ActionCard
                    action={action}
                    onDismiss={handleDismiss}
                    onDismissError={handleDismissError}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no type errors.

- [ ] **Step 3: Lint check**

Run: `npm run lint -- --max-warnings=0 components/dashboard/actions/actions-view.tsx`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/actions/actions-view.tsx
git commit -m "feat(actions): add ActionsView with fetch, state, and animated list"
```

---

## Task 2: DashboardTabs

URL-param-driven tab bar. Uses `useSearchParams` — the parent page wraps this in `<Suspense>` (added in Task 3) as required by Next.js App Router.

Tab IDs (`tab-actions`, `tab-insights`) and tabpanel IDs (`tabpanel-actions`, `tabpanel-insights`) are stable anchors for e2e selectors in PR 4c.

**Files:**
- Create: `components/dashboard/dashboard-tabs.tsx`

- [ ] **Step 1: Create dashboard-tabs.tsx**

```tsx
"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as DashboardTab | null) ?? "actions";

  const setTab = useCallback(
    (tab: DashboardTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
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
        <DashboardAnalyticsView />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no type errors.

- [ ] **Step 3: Lint check**

Run: `npm run lint -- --max-warnings=0 components/dashboard/dashboard-tabs.tsx`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/dashboard-tabs.tsx
git commit -m "feat(actions): add DashboardTabs with URL param tab state"
```

---

## Task 3: Wire dashboard server component

Fetch `display_name` from the profiles table and render `<DashboardTabs>`. Remove the direct `<DashboardAnalyticsView />` render. Wrap `<DashboardTabs>` in `<Suspense>` — required because `DashboardTabs` uses `useSearchParams`, which opts the client subtree out of SSR without a Suspense boundary.

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Update app/dashboard/page.tsx**

Replace entire file contents with:

```tsx
import { Suspense } from "react";
import { AddSessionModal } from "@/components/dashboard/session-form/add-session-modal";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { bootstrapUserProfile } from "@/lib/profiles/bootstrap-user-profile";
import { isUserProfileComplete } from "@/lib/profiles/is-user-profile-complete";
import { requireAuthenticatedUser } from "@/lib/supabase/require-authenticated-user";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireAuthenticatedUser({ supabase });

  await bootstrapUserProfile({
    supabase,
    userId: user.id,
    source: "dashboard_page",
  });

  const profileIsComplete = await isUserProfileComplete({
    supabase,
    userId: user.id,
  });

  if (!profileIsComplete) {
    redirect("/dashboard/profile-setup");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  const displayName = profile?.display_name ?? null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          Quick actions
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Capture session revenue and duration in under a minute.
        </p>
        <AddSessionModal />
      </section>
      <Suspense>
        <DashboardTabs displayName={displayName} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no type errors.

- [ ] **Step 3: Lint check**

Run: `npm run lint -- --max-warnings=0 app/dashboard/page.tsx`

Expected: no errors.

- [ ] **Step 4: Smoke test in browser**

Run: `npm run dev:local`

Open `http://localhost:3000/dashboard`. Verify:

1. "Quick actions" section is visible above the tab bar on both tabs.
2. "Actions" and "Insights" tabs render in the tab bar.
3. Actions tab is active by default (no `?tab` param).
4. ActionsView cycles through loading skeletons → empty state (seeded user has no sessions).
5. Clicking "Insights" switches panel, updates URL to `?tab=insights`.
6. Analytics cards render in the Insights panel.
7. Browser back button returns to `?tab=actions`.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(actions): wire dashboard page to DashboardTabs with display_name"
```
