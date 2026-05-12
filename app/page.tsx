import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BarChart3, BellRing, Calculator, CheckCircle2, Copy, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui";
import { FoundingCounter } from "@/components/marketing/founding-counter";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { RevenueChart } from "@/components/marketing/revenue-chart";
import { getFoundingCount } from "@/lib/marketing/get-founding-count";
import { TrackedLink } from "@/components/marketing/tracked-link";

const HOW_IT_WORKS = [
  {
    Icon: Pencil,
    step: "1",
    title: "Log a session",
    description:
      "Add a client, duration, and what you charged in under 30 seconds. Works alongside DMs, calendars, or however you already book.",
  },
  {
    Icon: Calculator,
    step: "2",
    title: "Costs come off automatically",
    description:
      "Chair rent, splits, and expenses are subtracted without you doing the maths. You see what you actually walked away with.",
  },
  {
    Icon: BarChart3,
    step: "3",
    title: "See your real numbers",
    description:
      "Your dashboard shows profit, repeat client rate, and who's at risk of drifting — no spreadsheet required.",
  },
  {
    Icon: BellRing,
    step: "4",
    title: "Get told who to message",
    description:
      "inkMetrics flags who's overdue a follow-up, what it's costing you to wait, and hands you a message ready to send.",
  },
] as const;

type ActionPriority = "HIGH" | "MEDIUM";

const SAMPLE_ACTIONS: {
  priority: ActionPriority;
  type: string;
  client: string;
  nudge: string;
  revenueAtRisk: string;
  template: string;
}[] = [
  {
    priority: "HIGH",
    type: "Lapsed repeat client",
    client: "Sarah M.",
    nudge: "It's been 9 weeks since their last session — worth a check-in.",
    revenueAtRisk: "£480",
    template:
      "Hey Sarah! It's been a while — I've got some availability coming up and thought of you. Fancy booking in for something new?",
  },
  {
    priority: "MEDIUM",
    type: "In-progress piece",
    client: "Jake T.",
    nudge: "Their piece is still in progress and it's been 6 weeks — time to follow up.",
    revenueAtRisk: "£340",
    template:
      "Hi Jake, just checking in on your sleeve — I've got some slots opening up to continue when you're ready.",
  },
  {
    priority: "MEDIUM",
    type: "New client follow-up",
    client: "Priya K.",
    nudge: "3 weeks since their first visit — a quick message could bring them back.",
    revenueAtRisk: "£220",
    template:
      "Hi Priya! Hope you're loving the piece. I'd love to see you back — any ideas for what's next?",
  },
];

function ActionCard({
  action,
}: {
  action: (typeof SAMPLE_ACTIONS)[number];
}) {
  const isHigh = action.priority === "HIGH";
  return (
    <div
      className={`relative overflow-hidden border bg-card ${
        isHigh ? "border-destructive/30" : "border-border"
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-0.5 ${
          isHigh ? "bg-destructive" : "bg-amber-400 dark:bg-amber-500"
        }`}
      />
      <div className="p-5 pl-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {action.type}
          </span>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              isHigh
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-400/15 text-amber-700 dark:text-amber-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isHigh ? "bg-destructive" : "bg-amber-500"
              }`}
            />
            {action.priority}
          </span>
        </div>

        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{action.client}</p>
            <p className="mt-0.5 text-sm text-foreground">
              {action.nudge}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              at risk
            </p>
            <p className="text-base font-bold text-foreground">
              {action.revenueAtRisk}
            </p>
          </div>
        </div>

        <div className="bg-muted/40 px-3 py-2.5">
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            &ldquo;{action.template}&rdquo;
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            className="inline-flex cursor-default items-center gap-1.5 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary opacity-60"
            tabIndex={-1}
            aria-hidden="true"
          >
            <Copy className="h-3 w-3" />
            Copy message
          </button>
          <button
            className="inline-flex cursor-default items-center gap-1 px-2.5 py-1 text-xs font-medium text-muted-foreground opacity-60"
            tabIndex={-1}
            aria-hidden="true"
          >
            <X className="h-3 w-3" />
            Dismiss
          </button>
          <span className="ml-auto text-[10px] italic text-muted-foreground/50">
            preview
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  // Fetch the founding-member count once and share it across every
  // FoundingCounter placement on the page so we never amplify DB load.
  const foundingCount = await getFoundingCount();

  return (
    <MarketingLayout activePath="product">
      <div className="flex flex-col gap-20 sm:gap-28">

        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Built for tattoo artists
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Know your numbers.
            <br className="hidden sm:block" /> Know your clients.
            <br className="hidden sm:block" /> Keep your workflow.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
            Log a session in 30 seconds. See what you actually take home after
            chair rent and expenses. Then find out exactly which clients to
            message — and get the words written for you.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <TrackedLink href="/auth/sign-up" eventName="hero_cta_click">
                Start free for 60 days
              </TrackedLink>
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
          <div className="mx-auto mt-6 max-w-sm">
            <FoundingCounter
              count={foundingCount.count}
              isFull={foundingCount.isFull}
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No card required · No booking migration
          </p>
        </section>

        {/* Problem */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            The problem
          </p>
          <h2 className="mb-6 text-2xl font-bold text-foreground sm:text-3xl">
            Most artists are flying blind on their own money
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>
              Platforms like Vagaro and Square will give you financial reports —
              but only if you move your{" "}
              <strong className="text-foreground">
                entire booking workflow
              </strong>{" "}
              into their system. Most artists book through Instagram DMs and
              personal calendars. That&apos;s not going to change.
            </p>
            <p>
              So the alternative is a spreadsheet. But after a long day, entries
              get skipped, clients drift away quietly, and{" "}
              <strong className="text-foreground">
                you have no idea who&apos;s worth chasing or what it&apos;s
                costing you not to
              </strong>
              .
            </p>
            <p>
              Neither option tells you that a regular hasn&apos;t booked in two
              months, or what you&apos;re losing by not following up.
            </p>
          </div>
          <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:p-5">
            <p className="text-sm font-bold text-primary">
              inkMetrics is the third option.
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
              It fits around how you already work — tracking your money and your
              clients, and telling you exactly who to reach out to next.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section>
          <h2 className="mb-10 text-center text-2xl font-bold text-foreground sm:text-3xl">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Actions showcase */}
        <section>
          <div className="mb-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              Actions
            </p>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Know exactly who to message — and what to say
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Based on your sessions, inkMetrics works out who&apos;s overdue a
              follow-up, what you stand to lose by waiting, and writes you
              something to send straight away.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
            {SAMPLE_ACTIONS.map((action) => (
              <ActionCard key={action.client} action={action} />
            ))}
          </div>
          <p className="mt-4 text-xs italic text-muted-foreground/60">
            Sample data — generated from your real sessions.
          </p>
        </section>

        {/* Revenue breakdown */}
        <section>
          <div className="mb-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              Sample month
            </p>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              See exactly where your money goes
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Chair rent, commissions, and expenses come off automatically. What
              you&apos;re left with is what you actually earned.
            </p>
          </div>
          <RevenueChart />
        </section>

        {/* Built for you */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Why this exists
          </p>
          <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
            Built from inside the problem
          </h2>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            I&apos;m Kiana. I live with a tattoo artist who&apos;s been doing
            this for 13 years — and I&apos;m one of his clients. I watched him
            track income in a notebook, slowly lose touch with clients who used
            to come back regularly, and hit every January with no clear picture
            of what he&apos;d actually made.
          </p>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            I built inkMetrics because I watched the problem up close. Every
            existing tool either wanted him to change how he works, or just
            didn&apos;t go far enough to be worth the effort.
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
              Every session and expense you log builds a clean record you can
              actually hand to an accountant. No bank statement archaeology, no
              receipts in a drawer. HMRC&apos;s record-keeping rules are only
              getting stricter — inkMetrics keeps you covered without adding to
              your workload.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
            Start your 60-day free trial
          </h2>
          <p className="mb-8 text-muted-foreground">
            No card, no booking migration. Keep working exactly how you work —
            just finally know your numbers.
          </p>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <TrackedLink href="/auth/sign-up" eventName="final_cta_click">
              Get started free
            </TrackedLink>
          </Button>
          <div className="mx-auto mt-6 max-w-sm">
            <FoundingCounter
              count={foundingCount.count}
              isFull={foundingCount.isFull}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Then £9.99/month. Cancel any time.
          </p>
        </section>

      </div>
    </MarketingLayout>
  );
}
