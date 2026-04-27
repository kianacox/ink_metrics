# Cards, Animation & Chart Colours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix shadcn card rounding that bypassed the zero-radius token, add Framer Motion entrance + hover-glow animations to all data cards, and replace hardcoded chart colours with the new muted tattoo-aesthetic palette.

**Architecture:** `components/ui/card.tsx` is patched directly (rounded-xl → rounded-none). A new `components/ui/animated-card.tsx` wraps `Card` via `motion(Card)` — no extra DOM node — with fade-up entrance (staggered by `index` prop) and gold border-glow on hover, both suppressed when `prefers-reduced-motion` is set. Mobile data card lists (`sessions-cards`, `clients-cards`, `expenses-cards`) swap `<Card>` for `<AnimatedCard>`. `AnalyticsCard` gains an `index` prop and uses `AnimatedCard` internally. Chart colours are updated in-place in `dashboard-analytics-view.tsx` and `expenses-by-category-card.tsx` — no structural changes.

**Tech Stack:** Next.js App Router, framer-motion (new dependency), Tailwind CSS token system.

---

## File Map

| File | Change |
|---|---|
| `components/ui/card.tsx` | `rounded-xl` → `rounded-none` |
| `components/ui/animated-card.tsx` | **New** — AnimatedCard with framer-motion |
| `components/ui/index.ts` | Export AnimatedCard |
| `components/dashboard/sessions/sessions-cards.tsx` | Card→AnimatedCard; fix emerald edit button; fix amber warning pill |
| `components/dashboard/clients/clients-cards.tsx` | Card→AnimatedCard (badge+button already fixed in prior commit) |
| `components/dashboard/expenses/expenses-cards.tsx` | Card→AnimatedCard; fix emerald edit button; fix rounded-full category badge |
| `components/dashboard/analytics/analytics-card.tsx` | Add `index` prop; Card→AnimatedCard internally |
| `components/dashboard/analytics/dashboard-analytics-view.tsx` | Update TAKE_HOME_COMPARISON_ITEMS colours |
| `components/dashboard/analytics/expenses-by-category-card.tsx` | Update CATEGORY_COLORS to muted palette |

---

### Task 1: Fix card radius in `components/ui/card.tsx`

**Files:**
- Modify: `components/ui/card.tsx`

The shadcn Card component hardcodes `rounded-xl` (Tailwind's built-in 12px radius) rather than using the custom `rounded-lg` alias that reads from `--radius`. Setting `--radius: 0rem` in the token system therefore had no effect on cards. Fix: change `rounded-xl` to `rounded-none`.

- [ ] **Step 1: Edit `components/ui/card.tsx`**

Find line 12:
```tsx
"rounded-xl border bg-card text-card-foreground shadow",
```
Replace with:
```tsx
"rounded-none border bg-card text-card-foreground shadow",
```

- [ ] **Step 2: Verify no other rounded-xl in this file**

Run: `grep "rounded-xl" components/ui/card.tsx`
Expected: no output.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/ui/card.tsx
git commit -m "style: fix card radius — rounded-xl bypassed --radius token"
```

---

### Task 2: Install framer-motion + create `AnimatedCard`

**Files:**
- Create: `components/ui/animated-card.tsx`
- Modify: `components/ui/index.ts`

`motion(Card)` wraps the existing Card component without adding an extra DOM node — framer-motion passes motion props through to the underlying div. `useReducedMotion()` returns true when the OS accessibility setting is enabled; all animation is then disabled. The entrance animation is a fade-up (opacity 0→1, y 12→0) with a staggered delay of `index * 60ms`. The hover state adds a 1px gold box-shadow ring.

- [ ] **Step 1: Install framer-motion**

Run: `npm install framer-motion`
Expected: package added, no peer dep warnings.

- [ ] **Step 2: Create `components/ui/animated-card.tsx`**

```tsx
"use client";

import { forwardRef } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Card } from "@/components/ui/card";
import type { ComponentPropsWithoutRef } from "react";

const MotionCard = motion(Card);

type AnimatedCardProps = ComponentPropsWithoutRef<typeof Card> & {
  index?: number;
};

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ index = 0, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();

    const variants: Variants = {
      hidden: { opacity: 0, y: 12 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.3,
          ease: "easeOut",
          delay: index * 0.06,
        },
      },
    };

    return (
      <MotionCard
        ref={ref}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        variants={variants}
        whileHover={
          shouldReduceMotion
            ? undefined
            : { boxShadow: "0 0 0 1px hsl(44 54% 54% / 0.3)" }
        }
        transition={{ duration: 0.15, ease: "easeOut" }}
        {...props}
      />
    );
  },
);

AnimatedCard.displayName = "AnimatedCard";
```

- [ ] **Step 3: Add AnimatedCard to barrel export in `components/ui/index.ts`**

Add this line after the Card export (line 3):
```ts
export { AnimatedCard } from "./animated-card";
```

The Card export line stays unchanged:
```ts
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
export { AnimatedCard } from "./animated-card";
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/ui/animated-card.tsx components/ui/index.ts package.json package-lock.json
git commit -m "feat: add AnimatedCard with framer-motion entrance and gold hover glow"
```

---

### Task 3: Apply AnimatedCard to mobile data card lists + fix remaining hardcoded colours

**Files:**
- Modify: `components/dashboard/sessions/sessions-cards.tsx`
- Modify: `components/dashboard/clients/clients-cards.tsx`
- Modify: `components/dashboard/expenses/expenses-cards.tsx`

Three mobile card list components still use the base `Card`. Swap to `AnimatedCard` with `index={idx}` from `.map((item, idx) => ...)`. Also fix remaining hardcoded colours found in these files:
- `sessions-cards.tsx`: emerald Edit button className override (remove it); amber "Follow-up session needed" pill (→ gold)
- `expenses-cards.tsx`: emerald Edit button className override (remove it); `rounded-full` on category badge (→ `rounded-none`)
- `clients-cards.tsx`: badge and edit button already fixed in prior commit — only AnimatedCard swap needed.

- [ ] **Step 1: Replace full content of `components/dashboard/sessions/sessions-cards.tsx`**

```tsx
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
import { AnimatedCard } from "@/components/ui/animated-card";
import {
  formatSessionDate,
  formatSessionDuration,
  formatSessionProfit,
} from "@/components/dashboard/sessions/utils/session-formatting";
import type { SessionListItem } from "@/components/dashboard/sessions/utils/session-listing";

interface SessionsCardsProps {
  sessions: SessionListItem[];
  currencyCode: string;
  reportingTimezone: string;
  onEditSession: (session: SessionListItem) => void;
  onDeleteSession: (session: SessionListItem) => void;
}

export function SessionsCards({
  sessions,
  currencyCode,
  reportingTimezone,
  onEditSession,
  onDeleteSession,
}: SessionsCardsProps) {
  return (
    <div className="grid gap-3 sm:hidden">
      {sessions.map((session, idx) => (
        <AnimatedCard key={session.id} index={idx} className="border-border">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{session.clientName}</CardTitle>
                <CardDescription>
                  {formatSessionDate(session.createdAt, reportingTimezone)}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEditSession(session)}
                  aria-label={`Edit session for ${session.clientName}`}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteSession(session)}
                  aria-label={`Delete session for ${session.clientName}`}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0">
            {session.throughAds ? (
              <p className="col-span-2 rounded-none border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
                Through Ads
              </p>
            ) : null}
            {session.inProgress && session.isLatestForClient ? (
              <p className="col-span-2 rounded-none border border-gold/50 bg-gold/10 px-2.5 py-1.5 text-xs font-medium text-gold">
                Follow-up session needed
              </p>
            ) : null}
            <div>
              <p className="text-xs text-muted-foreground">Length</p>
              <p className="text-sm font-medium text-foreground">
                {formatSessionDuration(session.durationMinutes)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className="text-sm font-medium text-foreground">
                {formatSessionProfit(session.priceMinor, currencyCode)}
              </p>
            </div>
          </CardContent>
        </AnimatedCard>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update `components/dashboard/clients/clients-cards.tsx`**

Two changes only — add `idx` to map and swap `Card` for `AnimatedCard`. Read the file first to confirm current state, then:

1. Change import: remove `Card` from the `@/components/ui` import, add `AnimatedCard` import:
```tsx
import { Button, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { AnimatedCard } from "@/components/ui/animated-card";
```

2. Change the map:
```tsx
{clients.map((client, idx) => {
```

3. Change the card element (opening and closing tags):
```tsx
<AnimatedCard key={client.id} index={idx} className="border-border">
  ...
</AnimatedCard>
```

- [ ] **Step 3: Replace full content of `components/dashboard/expenses/expenses-cards.tsx`**

```tsx
import { Button, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { AnimatedCard } from "@/components/ui/animated-card";
import {
  formatExpenseAmount,
  formatPurchaseDate,
} from "@/components/dashboard/expenses/utils/expense-formatting";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expenses/models";
import type { ExpenseListItem } from "@/lib/expenses/models";
import { Paperclip } from "lucide-react";

interface ExpensesCardsProps {
  expenses: ExpenseListItem[];
  currencyCode: string;
  onEditExpense: (expense: ExpenseListItem) => void;
  onDeleteExpense: (expense: ExpenseListItem) => void;
}

export function ExpensesCards({
  expenses,
  currencyCode,
  onEditExpense,
  onDeleteExpense,
}: ExpensesCardsProps) {
  return (
    <div className="grid min-w-0 gap-3 sm:hidden">
      {expenses.map((expense, idx) => (
        <AnimatedCard key={expense.id} index={idx} className="w-full border-border">
          <CardHeader className="p-4 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="mb-1.5 inline-flex items-center rounded-none bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {EXPENSE_CATEGORY_LABELS[expense.category]}
                </span>
                <CardTitle className="truncate text-base">{expense.item}</CardTitle>
              </div>
              <div className="flex w-full shrink-0 justify-end gap-1 min-[360px]:w-auto">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEditExpense(expense)}
                  aria-label={`Edit expense: ${expense.item}`}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteExpense(expense)}
                  aria-label={`Delete expense: ${expense.item}`}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-sm font-medium text-foreground">
                {formatExpenseAmount(expense.amountMinor, currencyCode)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date purchased</p>
              <p className="text-sm font-medium text-foreground">
                {formatPurchaseDate(expense.datePurchased)}
              </p>
            </div>
            {expense.receiptPath ? (
              <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip aria-hidden="true" className="size-3" />
                <span>Receipt attached</span>
              </div>
            ) : null}
          </CardContent>
        </AnimatedCard>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run lint and TypeScript check**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/sessions/sessions-cards.tsx \
        components/dashboard/clients/clients-cards.tsx \
        components/dashboard/expenses/expenses-cards.tsx
git commit -m "feat: animate mobile data cards with AnimatedCard, fix remaining hardcoded colours"
```

---

### Task 4: Add animation to analytics cards via `AnalyticsCard`

**Files:**
- Modify: `components/dashboard/analytics/analytics-card.tsx`
- Modify: `components/dashboard/analytics/dashboard-analytics-view.tsx`

`AnalyticsCard` wraps `Card` internally. Add an `index` prop and swap `Card` for `AnimatedCard`. Then pass `index` from the analytics view where each card is instantiated.

- [ ] **Step 1: Replace full content of `components/dashboard/analytics/analytics-card.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { CardContent, CardDescription, CardHeader, CardTitle, LoadingState } from "@/components/ui";

type AnalyticsCardState = "loading" | "empty" | "ready";

interface AnalyticsCardProps {
  title: string;
  description: string;
  state: AnalyticsCardState;
  index?: number;
  headerAction?: ReactNode;
  children?: ReactNode;
}

export function AnalyticsCard({
  title,
  description,
  state,
  index = 0,
  headerAction,
  children,
}: AnalyticsCardProps) {
  return (
    <AnimatedCard index={index} className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="leading-tight text-base">{title}</CardTitle>
          {headerAction ? <div className="mt-[-1px] shrink-0">{headerAction}</div> : null}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {state === "loading" ? (
          <LoadingState message="Loading metric…" />
        ) : null}
        {state === "empty" ? (
          <p className="text-sm text-muted-foreground">No data yet for this month.</p>
        ) : null}
        {state === "ready" ? children : null}
      </CardContent>
    </AnimatedCard>
  );
}
```

- [ ] **Step 2: Add `index` props to AnalyticsCard instances in `dashboard-analytics-view.tsx`**

Read `components/dashboard/analytics/dashboard-analytics-view.tsx`. Find all `<AnalyticsCard` usages and add `index={n}` starting from 0. There are 5 cards — add `index={0}` through `index={4}` in order of appearance in the JSX.

The change pattern (apply to each card in sequence):
```tsx
<AnalyticsCard
  index={0}
  title="Take-home summary"
  ...
```
```tsx
<AnalyticsCard
  index={1}
  title="Lifetime client retention rate"
  ...
```
```tsx
<AnalyticsCard
  index={2}
  title="Average profit per session"
  ...
```
```tsx
<AnalyticsCard
  index={3}
  title="Hours spent tattooing"
  ...
```
```tsx
<AnalyticsCard
  index={4}
  title="Expenses by category"
  ...
```

- [ ] **Step 3: Run lint and TypeScript check**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/analytics/analytics-card.tsx \
        components/dashboard/analytics/dashboard-analytics-view.tsx
git commit -m "feat: animate analytics cards via AnalyticsCard index prop"
```

---

### Task 5: Update take-home bar colours in `dashboard-analytics-view.tsx`

**Files:**
- Modify: `components/dashboard/analytics/dashboard-analytics-view.tsx`

`TAKE_HOME_COMPARISON_ITEMS` uses hardcoded Tailwind colour classes. Replace with the new hierarchy: grey for deduction bars, gold for the net (key metric) bar.

- [ ] **Step 1: Find and replace TAKE_HOME_COMPARISON_ITEMS**

In `components/dashboard/analytics/dashboard-analytics-view.tsx`, find:
```ts
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
    label: "Total Take-Home",
    colorClassName: "bg-blue-600",
  },
];
```

Replace with:
```ts
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
```

Chart token values in the new palette:
- `chart-2` = `hsl(0 0% 55%)` mid grey
- `chart-4` = `hsl(0 0% 35%)` dark grey
- `chart-5` = `hsl(0 0% 25%)` darkest grey (dark mode) / `hsl(0 0% 70%)` light (light mode)
- `gold` = `hsl(44 54% 54%)` warm gold

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/analytics/dashboard-analytics-view.tsx
git commit -m "style: update take-home bars — gold net, grey deductions"
```

---

### Task 6: Update expense category colours in `expenses-by-category-card.tsx`

**Files:**
- Modify: `components/dashboard/analytics/expenses-by-category-card.tsx`

`CATEGORY_COLORS` uses bright saturated Tailwind palette colours (`bg-indigo-500`, `bg-amber-500`, etc.). Replace with muted, desaturated hex colours that read clearly on dark backgrounds without clashing with the tattoo aesthetic.

- [ ] **Step 1: Find and replace CATEGORY_COLORS**

In `components/dashboard/analytics/expenses-by-category-card.tsx`, find:
```ts
const CATEGORY_COLORS: Record<string, string> = {
  ink: "bg-indigo-500",
  cartridges: "bg-amber-500",
  needles: "bg-rose-500",
  machines: "bg-cyan-500",
  other_equipment: "bg-violet-500",
  travel: "bg-emerald-500",
  miscellaneous: "bg-slate-400",
};
```

Replace with:
```ts
const CATEGORY_COLORS: Record<string, string> = {
  ink: "bg-[#7B6FA0]",
  cartridges: "bg-[#A08050]",
  needles: "bg-[#8B4A4A]",
  machines: "bg-[#4A7A8B]",
  other_equipment: "bg-[#5A7A5A]",
  travel: "bg-[#8B7A4A]",
  miscellaneous: "bg-[#6A6A6A]",
};
```

Colour derivation (desaturated ~40-50%, readable on dark + light backgrounds):
- ink `#7B6FA0` — dusty violet
- cartridges `#A08050` — warm amber
- needles `#8B4A4A` — muted rose
- machines `#4A7A8B` — slate blue
- other_equipment `#5A7A5A` — muted sage
- travel `#8B7A4A` — warm khaki
- miscellaneous `#6A6A6A` — neutral grey

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/analytics/expenses-by-category-card.tsx
git commit -m "style: update expense category colours to muted tattoo-aesthetic palette"
```

---

### Task 7: Lint + unit tests

**Files:** none changed

- [ ] **Step 1: Full lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 2: Full unit test suite**

Run: `npm test`
Expected: all tests pass (no logic was changed, only styles and a new UI component).

- [ ] **Step 3: TypeScript full check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual smoke test**

Start dev server: `npm run dev:local`

Check in browser:
- **Dark mode, mobile viewport** — sessions/clients/expenses cards fade up in sequence on page load. Gold border glow appears on hover.
- **Dark mode, dashboard** — 5 analytics cards stagger-fade in. Take-home bars: gold "net" bar, grey deduction bars.
- **Dark mode, expenses page** — category filter has muted multi-colour legend dots matching the bars.
- **Light mode** — same animations, parchment background, cards still sharp-cornered.
- **Reduced motion** (enable in OS → Accessibility → Reduce motion) — reload page, confirm no entrance animation or hover glow.
