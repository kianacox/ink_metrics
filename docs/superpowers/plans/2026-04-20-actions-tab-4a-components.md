# Actions Tab UI — PR 4a: Component Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build pure UI components for the Actions tab — skeleton, empty, and error states plus the `ActionCard` — with no changes to existing files.

**Architecture:** All new files under `components/dashboard/actions/`. The `Action` type is defined in `action-card.tsx` and exported so downstream consumers (`ActionsView` in PR 4b, e2e helpers in PR 4c) can import it. No routing or fetching here — pure presentational + interaction logic.

**Tech Stack:** framer-motion (^12.38.0, already installed), shadcn Card/Button, Tailwind, lucide-react

**Depends on:** PRs 1–3 merged (schema, API, session form checkbox)
**Unlocks:** PR 4b (ActionsView + DashboardTabs + page integration)

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `components/dashboard/actions/action-card-skeleton.tsx` | Create | Pulse skeleton card (loading state) |
| `components/dashboard/actions/actions-empty-state.tsx` | Create | Empty state — checkmark icon + copy |
| `components/dashboard/actions/actions-error-state.tsx` | Create | Error state — RefreshCw icon + Try again |
| `components/dashboard/actions/action-card.tsx` | Create | Card UI, template accordion, dismiss callback |

No existing files are modified in this PR.

---

## Task 1: State components (skeleton, empty, error)

Pure presentational — no props beyond a retry callback on the error state. Build first so Task 2 doesn't have missing imports.

**Files:**
- Create: `components/dashboard/actions/action-card-skeleton.tsx`
- Create: `components/dashboard/actions/actions-empty-state.tsx`
- Create: `components/dashboard/actions/actions-error-state.tsx`

- [ ] **Step 1: Create action-card-skeleton.tsx**

```tsx
export function ActionCardSkeleton() {
  return (
    <div className="animate-pulse rounded-none border bg-card p-6 shadow">
      <div className="mb-2 h-5 w-1/3 rounded bg-muted" />
      <div className="mb-1 h-4 w-2/3 rounded bg-muted" />
      <div className="mb-6 h-4 w-1/4 rounded bg-muted" />
      <div className="flex justify-between">
        <div className="h-8 w-28 rounded bg-muted" />
        <div className="h-8 w-20 rounded bg-muted" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create actions-empty-state.tsx**

```tsx
import { CheckCircle2 } from "lucide-react";

export function ActionsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
      <p className="font-semibold text-foreground">All caught up</p>
      <p className="text-sm text-muted-foreground">
        No actions right now — your client list looks healthy.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create actions-error-state.tsx**

```tsx
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionsErrorStateProps {
  onRetry: () => void;
}

export function ActionsErrorState({ onRetry }: ActionsErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <RefreshCw className="h-10 w-10 text-muted-foreground" />
      <p className="font-semibold text-foreground">Something went wrong</p>
      <p className="text-sm text-muted-foreground">
        Couldn't load actions. Try refreshing.
      </p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no type errors.

- [ ] **Step 5: Lint check**

Run: `npm run lint -- --max-warnings=0 components/dashboard/actions/`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/actions/action-card-skeleton.tsx \
        components/dashboard/actions/actions-empty-state.tsx \
        components/dashboard/actions/actions-error-state.tsx
git commit -m "feat(actions): add skeleton, empty, and error state components"
```

---

## Task 2: ActionCard component

Two-zone shadcn Card with an inline template accordion (framer-motion `AnimatePresence`) and a dismiss button. The exit animation for the card itself (when dismissed from the list) is handled by the parent `ActionsView` in PR 4b — this component only receives `onDismiss` and `onDismissError` callbacks.

**Files:**
- Create: `components/dashboard/actions/action-card.tsx`

- [ ] **Step 1: Create action-card.tsx**

```tsx
"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui";
import { formatMinorAsCurrency } from "@/lib/dashboard-analytics";

export interface Action {
  actionId: string;
  clientId: string;
  clientName: string;
  actionType: "lapsed_repeat" | "new_client" | "in_progress";
  weeksSince: number;
  revenueAtRiskMinor: number;
  messageTemplate: string;
}

function getNudgeCopy(actionType: Action["actionType"], weeksSince: number): string {
  switch (actionType) {
    case "lapsed_repeat":
      return `It's been ${weeksSince} weeks since their last session — worth a check-in.`;
    case "new_client":
      return `${weeksSince} weeks since their first visit — a quick message could bring them back.`;
    case "in_progress":
      return `Their piece is still in progress and it's been ${weeksSince} weeks — time to follow up.`;
  }
}

interface ActionCardProps {
  action: Action;
  onDismiss: (actionId: string) => void;
  onDismissError: () => void;
}

export function ActionCard({ action, onDismiss, onDismissError }: ActionCardProps) {
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(action.messageTemplate);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [action.messageTemplate]);

  const handleDismiss = useCallback(async () => {
    setIsDismissing(true);
    try {
      const res = await fetch(`/api/dashboard/actions/${action.actionId}/dismiss`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("dismiss failed");
      onDismiss(action.actionId);
    } catch {
      setIsDismissing(false);
      onDismissError();
    }
  }, [action.actionId, onDismiss, onDismissError]);

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="font-semibold text-foreground">{action.clientName}</p>
        <p className="mt-1 text-sm text-foreground">
          {getNudgeCopy(action.actionType, action.weeksSince)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatMinorAsCurrency(action.revenueAtRiskMinor)} at risk
        </p>

        <AnimatePresence initial={false}>
          {isTemplateOpen && (
            <motion.div
              key="template"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <div className="mt-4 rounded border border-border bg-muted p-3 text-sm text-foreground whitespace-pre-wrap">
                {action.messageTemplate}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleCopy}
              >
                {isCopied ? "Copied!" : "Copy message"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsTemplateOpen((prev) => !prev)}
        >
          {isTemplateOpen ? "Hide message" : "View message"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          disabled={isDismissing}
        >
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no type errors.

- [ ] **Step 3: Lint check**

Run: `npm run lint -- --max-warnings=0 components/dashboard/actions/action-card.tsx`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/actions/action-card.tsx
git commit -m "feat(actions): add ActionCard with template accordion and dismiss"
```
