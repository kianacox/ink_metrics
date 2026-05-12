import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { FoundingCounter } from "@/components/marketing/founding-counter";
import { getFoundingCount } from "@/lib/marketing/get-founding-count";
import { TrackedLink } from "@/components/marketing/tracked-link";

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

const FOUNDING_PRICE = "£9.99";
const STANDARD_PRICE = "£14.99";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const { count, isFull } = await getFoundingCount();

  const headlinePrice = isFull ? STANDARD_PRICE : FOUNDING_PRICE;

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

        {isFull ? (
          <div className="mb-6">
            <FoundingCounter count={count} isFull={isFull} />
          </div>
        ) : null}

        <div
          data-testid="pricing-card"
          className="rounded-none border border-border bg-card p-8 shadow-sm"
        >
          <div className="mb-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Solo Artist Plan
            </p>
            <p className="mt-2">
              <span className="text-4xl font-bold text-foreground">
                {headlinePrice}
              </span>
              <span className="text-muted-foreground">/month</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              after your 60-day free trial
            </p>
            {!isFull ? (
              <p className="mt-2 text-sm text-foreground">
                This price is locked in for life for founding members.
              </p>
            ) : null}
          </div>

          {!isFull ? (
            <div className="mb-6">
              <FoundingCounter count={count} isFull={isFull} />
            </div>
          ) : null}

          <ul className="mb-8 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <Button asChild className="w-full" size="lg">
            <TrackedLink href="/auth/sign-up" eventName="pricing_cta_click">
              Start free for 60 days
            </TrackedLink>
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            No credit card required to start
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}
