import { AppChrome } from "@/components/shared/app-chrome";
import { Button } from "@/components/ui";
import Link from "next/link";

export default function Home() {
  return (
    <AppChrome>
      <div className="flex flex-col gap-10 sm:gap-14 lg:gap-16">
        <section className="mx-auto max-w-3xl text-center sm:mx-0 sm:text-left">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-primary sm:text-sm sm:normal-case sm:tracking-normal">
            Financial heartbeat for tattoo artists
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            See your real profit—without changing how you book.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
            All-in-one studio software forces you to move your whole workflow.
            Spreadsheets give you nothing back. inkMetrics is the
            platform-agnostic back-of-house: log sessions in seconds, keep your
            clients on Instagram or DMs, and build toward net profit, LTV, and
            compliance-ready records.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-start">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/auth/sign-up">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          <article className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              Low-friction logging
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Capture client, session length, and revenue in under thirty
              seconds—so data doesn&apos;t die in a notebook after a long day.
            </p>
          </article>
          <article className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              True net picture
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Move toward visibility on what you actually take home after splits
              and supplies—not just top-line bookings.
            </p>
          </article>
          <article className="rounded-lg border border-border bg-card p-5 sm:p-6 sm:col-span-2 lg:col-span-1">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              Built for how you work
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              No forced migration from DMs or Instagram. Focus on the financial
              layer while your creative and booking flow stay yours.
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-primary/25 bg-muted/50 p-5 sm:p-8 lg:p-10">
          <h2 className="text-lg font-semibold text-foreground sm:text-xl">
            Why this matters now
          </h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground sm:pl-6">
            <li>
              Artists often lack real-time visibility into cash flow—especially
              through seasonal dips—when tools are either bloated or manual.
            </li>
            <li>
              Without LTV and retention signals, it&apos;s hard to know which
              relationships actually drive the business.
            </li>
            <li>
              Digital record-keeping expectations are rising; ad-hoc notebooks
              don&apos;t scale with compliance pressure.
            </li>
          </ul>
        </section>
      </div>
    </AppChrome>
  );
}
