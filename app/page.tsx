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
