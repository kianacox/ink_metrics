# Marketing Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a marketing landing page with a 60-day free trial offer, a pricing page, and capture `trial_started_at` on first profile creation.

**Architecture:** Two PRs — PR 1 adds the `trial_started_at` column to `profiles` and writes it on first profile bootstrap; PR 2 replaces `app/page.tsx` with a full marketing landing page, adds `app/pricing/page.tsx`, creates a `MarketingLayout` component that replaces `AppChrome` for public routes, and adds trial messaging to the sign-up form.

**Tech Stack:** Next.js App Router, Supabase Postgres, Tailwind, shadcn/ui, lucide-react, Playwright

---

## File Map

### PR 1 — Trial Foundation
| Action | Path |
|--------|------|
| Create | `supabase/migrations/20260420100000_slice6_trial_started_at.sql` |
| Modify | `lib/profiles/ensure-user-profile.ts` |
| Modify | `lib/profiles/ensure-user-profile.test.ts` |
| Modify | `supabase/seed.sql` |

### PR 2 — Marketing Surface
| Action | Path |
|--------|------|
| Create | `components/marketing/marketing-layout.tsx` |
| Modify | `app/page.tsx` |
| Create | `app/pricing/page.tsx` |
| Modify | `components/auth/sign-up-form.tsx` |
| Create | `tests/landing-page.spec.ts` |

---

## PR 1 — Trial Foundation

### Task 1: Add `trial_started_at` migration

**Files:**
- Create: `supabase/migrations/20260420100000_slice6_trial_started_at.sql`

- [ ] **Step 1: Create the migration file**

```sql
alter table public.profiles
  add column if not exists trial_started_at timestamp with time zone;
```

- [ ] **Step 2: Apply migration locally**

```bash
npm run supabase:db:reset
```

Expected: reset completes without errors. No data assertion needed — the column is nullable with no default, so existing rows are unaffected.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260420100000_slice6_trial_started_at.sql
git commit -m "feat(db): add trial_started_at column to profiles"
```

---

### Task 2: Write `trial_started_at` into the profile upsert

**Files:**
- Modify: `lib/profiles/ensure-user-profile.ts`
- Modify: `lib/profiles/ensure-user-profile.test.ts`

`ensureUserProfile` uses `ignoreDuplicates: true`, so `trial_started_at` is only written on the first insert — never overwritten on repeat calls. This is the correct behaviour.

- [ ] **Step 1: Update the failing test first**

Replace the entire content of `lib/profiles/ensure-user-profile.test.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CURRENCY } from "../currency";
import { ensureUserProfile } from "./ensure-user-profile";

describe("ensureUserProfile", () => {
  it("throws when userId is missing", async () => {
    const mockSupabase = {
      from(tableName: "profiles") {
        void tableName;
        return {
          upsert() {
            return Promise.resolve({ error: null });
          },
        };
      },
    };

    await expect(
      ensureUserProfile({
        supabase: mockSupabase as unknown as SupabaseClient,
        userId: "",
      }),
    ).rejects.toThrow("Cannot create a profile without a user id.");
  });

  it("upserts profile with default GBP currency, incomplete flag, trial date, and duplicate-safe options", async () => {
    let capturedTableName = "";
    let capturedPayload: unknown;
    let capturedOptions: unknown;

    const mockResult = { error: null };
    const mockSupabase = {
      from(tableName: "profiles") {
        capturedTableName = tableName;
        return {
          upsert(payload: unknown, options: unknown) {
            capturedPayload = payload;
            capturedOptions = options;
            return Promise.resolve(mockResult);
          },
        };
      },
    };

    const before = new Date();
    const result = await ensureUserProfile({
      supabase: mockSupabase as unknown as SupabaseClient,
      userId: "user-123",
    });
    const after = new Date();

    expect(capturedTableName).toBe("profiles");

    const payload = capturedPayload as Record<string, unknown>;
    expect(payload.user_id).toBe("user-123");
    expect(payload.default_currency).toBe(DEFAULT_CURRENCY);
    expect(payload.is_profile_complete).toBe(false);
    expect(typeof payload.trial_started_at).toBe("string");

    const trialDate = new Date(payload.trial_started_at as string);
    expect(trialDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(trialDate.getTime()).toBeLessThanOrEqual(after.getTime());

    expect(capturedOptions).toEqual({
      onConflict: "user_id",
      ignoreDuplicates: true,
    });
    expect(result).toBe(mockResult);
  });
});
```

- [ ] **Step 2: Run test and confirm it fails**

```bash
npx jest ensure-user-profile
```

Expected: FAIL — `trial_started_at` not present in payload yet.

- [ ] **Step 3: Update `ensure-user-profile.ts`**

Replace the entire content of `lib/profiles/ensure-user-profile.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CURRENCY } from "@/lib/currency";

interface EnsureUserProfileParams {
  supabase: SupabaseClient;
  userId: string;
}

export async function ensureUserProfile({
  supabase,
  userId,
}: EnsureUserProfileParams) {
  if (!userId) {
    throw new Error("Cannot create a profile without a user id.");
  }

  return supabase.from("profiles").upsert(
    {
      user_id: userId,
      default_currency: DEFAULT_CURRENCY,
      is_profile_complete: false,
      trial_started_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: true,
    },
  );
}
```

- [ ] **Step 4: Run test and confirm it passes**

```bash
npx jest ensure-user-profile
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/profiles/ensure-user-profile.ts lib/profiles/ensure-user-profile.test.ts
git commit -m "feat(profiles): capture trial_started_at on first profile creation"
```

---

### Task 3: Update seed data to include `trial_started_at`

**Files:**
- Modify: `supabase/seed.sql`

Seeded users get `trial_started_at = now()`. Since they are test fixtures, an active trial is appropriate.

- [ ] **Step 1: Update the profiles insert in `supabase/seed.sql`**

Find this block (around line 181):

```sql
  insert into public.profiles (
    user_id,
    display_name,
    default_currency,
    reporting_timezone,
    week_starts_on,
    is_profile_complete,
    profile_completed_at
  )
  values
    (session_user_id, 'Seeded Session User', 'GBP', 'Europe/London', 1, true, now()),
    (incomplete_user_id, null, 'GBP', 'Europe/London', 1, false, null),
    (demo_user_id, 'Demo Artist', 'GBP', 'Europe/London', 1, true, now());
```

Replace it with:

```sql
  insert into public.profiles (
    user_id,
    display_name,
    default_currency,
    reporting_timezone,
    week_starts_on,
    is_profile_complete,
    profile_completed_at,
    trial_started_at
  )
  values
    (session_user_id, 'Seeded Session User', 'GBP', 'Europe/London', 1, true, now(), now()),
    (incomplete_user_id, null, 'GBP', 'Europe/London', 1, false, null, now()),
    (demo_user_id, 'Demo Artist', 'GBP', 'Europe/London', 1, true, now(), now());
```

- [ ] **Step 2: Reset DB to verify seed applies cleanly**

```bash
npm run supabase:db:reset
```

Expected: completes without errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(seed): include trial_started_at for seeded users"
```

---

## PR 2 — Marketing Surface

### Task 4: Write failing e2e tests for marketing surface

**Files:**
- Create: `tests/landing-page.spec.ts`

Writing tests first so implementation has a clear target.

- [ ] **Step 1: Create `tests/landing-page.spec.ts`**

```ts
import { test, expect } from "@playwright/test";
import { loginAsSeededUser } from "./auth-helpers";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero headline", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /See your real profit/i }),
    ).toBeVisible();
  });

  test("hero primary CTA links to sign-up", async ({ page }) => {
    const link = page
      .getByRole("link", { name: "Start free for 60 days" })
      .first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/auth/sign-up");
  });

  test("nav Pricing link navigates to pricing page", async ({ page }) => {
    await page.getByRole("link", { name: "Pricing" }).click();
    await expect(page).toHaveURL("/pricing");
    await expect(
      page.getByRole("heading", { name: /Simple pricing/i }),
    ).toBeVisible();
  });

  test("footer Privacy Policy link present", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Privacy Policy" }),
    ).toBeVisible();
  });

  test("footer Terms and Conditions link present", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Terms and Conditions" }),
    ).toBeVisible();
  });
});

test.describe("Landing page — authenticated redirect", () => {
  test("authenticated user on / redirects to /dashboard", async ({ page }) => {
    await loginAsSeededUser(page, "sessionComplete");
    await page.goto("/");
    await expect(page).toHaveURL("/dashboard");
  });
});

test.describe("Pricing page", () => {
  test("shows plan price and CTA", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("£9.99")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Start free for 60 days" }),
    ).toBeVisible();
  });

  test("pricing CTA links to sign-up", async ({ page }) => {
    await page.goto("/pricing");
    await expect(
      page.getByRole("link", { name: "Start free for 60 days" }),
    ).toHaveAttribute("href", "/auth/sign-up");
  });

  test("authenticated user on /pricing redirects to /dashboard", async ({
    page,
  }) => {
    await loginAsSeededUser(page, "sessionComplete");
    await page.goto("/pricing");
    await expect(page).toHaveURL("/dashboard");
  });
});

test.describe("Sign-up page — trial messaging", () => {
  test("shows 60 days free messaging", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await expect(page.getByText(/60 days free/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail for the right reason**

```bash
PLAYWRIGHT_SKIP_DB_RESET=1 npx playwright test landing-page
```

Expected: multiple FAIL — pages don't have the expected content yet. If a test fails with a connection error rather than assertion error, check that `npm run dev` is running.

- [ ] **Step 3: Commit tests**

```bash
git add tests/landing-page.spec.ts
git commit -m "test(e2e): add landing page, pricing, and sign-up trial messaging specs"
```

---

### Task 5: Create `MarketingLayout` component

**Files:**
- Create: `components/marketing/marketing-layout.tsx`

This replaces `AppChrome` for public marketing routes. It renders a nav with logo, "Product" and "Pricing" links, Sign in / Get started buttons, and a footer with Privacy Policy and Terms and Conditions.

- [ ] **Step 1: Create `components/marketing/marketing-layout.tsx`**

```tsx
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

function MarketingHeader({
  activePath,
}: {
  activePath: "product" | "pricing";
}) {
  return (
    <header className="flex w-full justify-center border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:h-16 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center py-1 font-semibold text-primary [-webkit-tap-highlight-color:transparent]"
          >
            inkMetrics
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activePath === "product"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Product
            </Link>
            <Link
              href="/pricing"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activePath === "pricing"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pricing
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Suspense>
            <ThemeSwitcher />
          </Suspense>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/auth/sign-up">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="flex w-full justify-center border-t border-border bg-background">
      <div className="flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <span className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} inkMetrics
        </span>
        <nav className="flex items-center gap-4">
          <Link
            href="/privacy-policy"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-and-conditions"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms and Conditions
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export function MarketingLayout({
  children,
  activePath = "product",
}: {
  children: React.ReactNode;
  activePath?: "product" | "pricing";
}) {
  return (
    <main className="flex min-h-dvh min-h-[100dvh] flex-col bg-background">
      <MarketingHeader activePath={activePath} />
      <div className="flex flex-1 flex-col items-center">
        <div className="w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
          {children}
        </div>
      </div>
      <MarketingFooter />
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/marketing/marketing-layout.tsx
git commit -m "feat(marketing): add MarketingLayout component with nav and footer"
```

---

### Task 6: Build the full landing page

**Files:**
- Modify: `app/page.tsx`

Replaces the existing basic page. Checks auth at the top — redirects authenticated users to `/dashboard`. Renders all 7 sections inside `MarketingLayout`.

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BarChart3, Calculator, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const HOW_IT_WORKS = [
  {
    Icon: Pencil,
    step: "1",
    title: "Log a session",
    description:
      "Capture client, duration, and revenue in under 30 seconds. Works alongside Instagram DMs, calendars, or however you book.",
  },
  {
    Icon: Calculator,
    step: "2",
    title: "Costs deducted automatically",
    description:
      "Chair rent, commission splits, and expenses calculated without you doing the maths. You see what you actually take home.",
  },
  {
    Icon: BarChart3,
    step: "3",
    title: "See your business health",
    description:
      "Real-time dashboard surfaces profit, client lifetime value, and retention signals — so you know which relationships drive your income.",
  },
] as const;

const METRICS = [
  {
    label: "Take-home this month",
    value: "£4,240",
    sub: "after chair rent & supplies",
  },
  {
    label: "Avg profit per session",
    value: "£185",
    sub: "up from £162 last month",
  },
  {
    label: "Customer LTV",
    value: "£680",
    sub: "average across all clients",
  },
  {
    label: "Returning client rate",
    value: "74%",
    sub: "of clients booked again",
  },
  { label: "Top client value", value: "£520", sub: "lifetime value" },
  { label: "Hours tattooing", value: "38h", sub: "this month" },
] as const;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <MarketingLayout activePath="product">
      <div className="flex flex-col gap-20 sm:gap-28">

        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Financial health for tattoo artists
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            See your real profit.
            <br className="hidden sm:block" /> Keep your workflow.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
            Log sessions in 30 seconds. Automatic deductions for chair rent,
            commissions, and supplies. Clear business metrics — no bank
            connection, no booking migration required.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/auth/sign-up">Start free for 60 days</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No card required · No booking migration
          </p>
        </section>

        {/* Problem */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-destructive">
              The problem
            </p>
            <h3 className="mb-2 font-semibold text-foreground">
              All-in-one platforms
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Vagaro, Square, DaySmart — force a full booking migration just to
              access basic financial reports. Bloated, expensive, built for
              studios not solo artists.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-destructive">
              The problem
            </p>
            <h3 className="mb-2 font-semibold text-foreground">
              Manual spreadsheets
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              After a long day entries get forgotten. No LTV, no retention
              signals, no compliance story. Fine for a side project — not for a
              professional business.
            </p>
          </div>
          <div className="rounded-lg border border-primary/25 bg-muted/50 p-5 sm:p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
              The solution
            </p>
            <h3 className="mb-2 font-semibold text-foreground">inkMetrics</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Back-of-house business intelligence. Keep Instagram DMs, Google
              Calendar, or whatever you use. Log what matters and get the
              metrics that drive your income.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section>
          <h2 className="mb-10 text-center text-2xl font-bold text-foreground sm:text-3xl">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ Icon, step, title, description }) => (
              <div
                key={step}
                className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Step {step}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Metrics showcase */}
        <section>
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Metrics that matter to your business
            </h2>
            <p className="mt-3 text-muted-foreground">
              Dashboard built around how tattoo artists actually earn.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-5">
            {METRICS.map(({ label, value, sub }) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-card p-4 sm:p-5"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
                  {value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs italic text-muted-foreground">
            Sample data — your real numbers, live.
          </p>
        </section>

        {/* Built for artists */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-10">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
              Built for you
            </p>
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
              Designed by someone who lives the artist&apos;s workflow
            </h2>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              inkMetrics was developed alongside a professional tattoo artist
              with over 13 years of experience — and road-tested by their
              clients. Every feature decision came from watching real workflows:
              the Instagram DM bookings, the chair rent negotiations, the
              tax-season spreadsheet scramble.
            </p>
            <ul className="space-y-3">
              {[
                "No forced booking migration — keep DMs, calendars, whatever works",
                "No bank connection required — full control over your data",
                "Designed for solo artists, not multi-chair studios",
              ].map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Tax season */}
        <section className="rounded-xl border border-primary/25 bg-muted/30 p-6 sm:p-10">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
              Tax season
            </p>
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
              No more spreadsheet archaeology in January
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Every session and expense logged throughout the year means clean,
              organised records when you need them. Send your accountant a clear
              export — not a pile of bank statements and receipts. Digital
              record-keeping requirements are increasing; inkMetrics gets you
              there without extra admin.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
            Start your 60-day free trial
          </h2>
          <p className="mb-8 text-muted-foreground">
            No card required. No booking migration. Keep your workflow exactly
            as it is — and finally see your real numbers.
          </p>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/auth/sign-up">Get started free</Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Then £9.99/month. Cancel any time.
          </p>
        </section>

      </div>
    </MarketingLayout>
  );
}
```

- [ ] **Step 2: Run lint on touched files**

```bash
npx eslint app/page.tsx components/marketing/marketing-layout.tsx --max-warnings 0
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(marketing): build full landing page with all sections"
```

---

### Task 7: Build the pricing page

**Files:**
- Create: `app/pricing/page.tsx`

Single plan card. Authenticated users are redirected to `/dashboard`.

- [ ] **Step 1: Create `app/pricing/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

const FEATURES = [
  "Unlimited session logging",
  "True net profit — after chair rent & expenses",
  "Client lifetime value tracking",
  "Returning client rate",
  "Average profit per session",
  "Expense tracking by category",
  "Client engagement action signals",
  "Compliance-ready expense records",
  "Works with any booking system",
  "No bank connection required",
] as const;

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <MarketingLayout activePath="pricing">
      <div className="mx-auto max-w-lg py-4">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Simple pricing
          </h1>
          <p className="mt-3 text-muted-foreground">
            60 days free. No card required. Cancel any time.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Solo Artist Plan
            </p>
            <p className="mt-2">
              <span className="text-4xl font-bold text-foreground">£9.99</span>
              <span className="text-muted-foreground">/month</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              after your 60-day free trial
            </p>
          </div>

          <ul className="mb-8 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <Button asChild className="w-full" size="lg">
            <Link href="/auth/sign-up">Start free for 60 days</Link>
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            No credit card required to start
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/pricing/page.tsx
git commit -m "feat(marketing): add pricing page with single plan card"
```

---

### Task 8: Add trial messaging to the sign-up form

**Files:**
- Modify: `components/auth/sign-up-form.tsx`

Update `CardDescription` so users landing on the sign-up page see the trial offer.

- [ ] **Step 1: Update `CardDescription` in `components/auth/sign-up-form.tsx`**

Find:

```tsx
          <CardTitle className="text-xl sm:text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
```

Replace with:

```tsx
          <CardTitle className="text-xl sm:text-2xl">Sign up</CardTitle>
          <CardDescription>
            60 days free · No card required
          </CardDescription>
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/sign-up-form.tsx
git commit -m "feat(auth): show 60-day free trial messaging on sign-up form"
```

---

### Task 9: Run full e2e suite and verify

- [ ] **Step 1: Run landing page e2e tests**

```bash
PLAYWRIGHT_SKIP_DB_RESET=1 npx playwright test landing-page
```

Expected: all tests PASS.

- [ ] **Step 2: Run full e2e suite to catch regressions**

```bash
npm run test:e2e
```

Expected: all existing specs continue to pass. If any fail, investigate before proceeding.

- [ ] **Step 3: Run unit tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors or warnings.

---

## PR Checklist

### PR 1 — Trial Foundation
- [ ] Migration adds `trial_started_at` column (nullable, no default)
- [ ] `ensure-user-profile.ts` writes `trial_started_at` on first insert
- [ ] `ensure-user-profile.test.ts` verifies payload includes `trial_started_at`
- [ ] Seed includes `trial_started_at` for all three seeded users
- [ ] `npm run supabase:db:reset` completes cleanly
- [ ] `npm test` passes

### PR 2 — Marketing Surface
- [ ] `MarketingLayout` renders nav (logo, Product, Pricing, Sign in, Get started) and footer (Privacy Policy, Terms and Conditions)
- [ ] Landing page has all 7 sections: Hero, Problem, How It Works, Metrics, Built for Artists, Tax Season, Final CTA
- [ ] Authenticated user on `/` is redirected to `/dashboard`
- [ ] Authenticated user on `/pricing` is redirected to `/dashboard`
- [ ] Pricing page shows £9.99/month, 60-day trial, feature list, CTA to `/auth/sign-up`
- [ ] Sign-up form shows "60 days free · No card required"
- [ ] All e2e tests in `landing-page.spec.ts` pass
- [ ] Full e2e suite passes (no regressions)
- [ ] `npm run lint` passes
