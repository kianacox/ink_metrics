"use client";

import { useMemo, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  PROFILE_CURRENCIES,
  parseProfileSetupPayload,
  toBps,
  toMinorAmount,
  type ProfileCurrency,
  type RentFrequency,
  type RentType,
} from "@/lib/profiles/profile-setup";
import {
  detectBrowserTimezone,
  getDefaultReportingTimezone,
  isSupportedTimezone,
} from "@/lib/timezones";
import { TimezoneCombobox } from "@/components/shared/timezone-combobox";
import { ChoiceButton } from "@/components/dashboard/profile/components/choice-button";
import { ProfileSetupComplete } from "./profile-setup-complete";
import {
  MOBILE_STEPS,
  type CappedChoice,
  type ChairRentChoice,
  type ProfileSetupCandidate,
  type ProfileSetupFlowProps,
} from "./profile-setup-models";

export function ProfileSetupFlow({ initialCurrency, initialTimezone }: ProfileSetupFlowProps) {
  const [displayName, setDisplayName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState<ProfileCurrency>(() => {
    if (PROFILE_CURRENCIES.includes(initialCurrency as ProfileCurrency)) {
      return initialCurrency as ProfileCurrency;
    }
    return "GBP";
  });
  const [reportingTimezone, setReportingTimezone] = useState<string>(() => {
    if (isSupportedTimezone(initialTimezone)) {
      return initialTimezone;
    }

    const browserTimezone = detectBrowserTimezone();
    if (browserTimezone) {
      return browserTimezone;
    }

    return getDefaultReportingTimezone();
  });
  const [payChairRent, setPayChairRent] = useState<ChairRentChoice>(null);
  const [rentType, setRentType] = useState<RentType | null>(null);
  const [fixedFrequency, setFixedFrequency] = useState<RentFrequency | null>(null);
  const [fixedAmount, setFixedAmount] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [commissionCapped, setCommissionCapped] = useState<CappedChoice>(null);
  const [commissionCapFrequency, setCommissionCapFrequency] =
    useState<RentFrequency | null>(null);
  const [commissionCapAmount, setCommissionCapAmount] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [mobileStepIndex, setMobileStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const mobileSteps = useMemo(() => MOBILE_STEPS, []);

  const activeMobileStep = mobileSteps[mobileStepIndex] ?? "identity";
  const isFinalMobileStep = mobileStepIndex === mobileSteps.length - 1;

  const isNextDisabled = useMemo(() => {
    if (isSubmitting) return true;
    if (activeMobileStep === "chairRent") return payChairRent === null;
    if (activeMobileStep === "rentType") return payChairRent !== false && rentType === null;
    return false;
  }, [activeMobileStep, payChairRent, rentType, isSubmitting]);

  function resetRentDetails(nextPayChairRent: ChairRentChoice) {
    if (nextPayChairRent === false) {
      setRentType(null);
      setFixedFrequency(null);
      setFixedAmount("");
      setCommissionRate("");
      setCommissionCapped(null);
      setCommissionCapFrequency(null);
      setCommissionCapAmount("");
      return;
    }
  }

  function buildCandidatePayload(): ProfileSetupCandidate {
    const candidateRentType = payChairRent ? rentType : null;
    const fixedAmountMinor =
      candidateRentType === "fixed" ? toMinorAmount(fixedAmount) : null;
    const commissionRateBps =
      candidateRentType === "commission" ? toBps(commissionRate) : null;
    const candidateCapped =
      candidateRentType === "commission" ? commissionCapped : null;
    const commissionCapAmountMinor =
      candidateCapped === true ? toMinorAmount(commissionCapAmount) : null;

    return {
      displayName,
      defaultCurrency,
      reportingTimezone,
      payChairRent,
      rentType: candidateRentType,
      fixedFrequency: candidateRentType === "fixed" ? fixedFrequency : null,
      fixedAmountMinor,
      commissionRateBps,
      commissionCapped: candidateCapped,
      commissionCapFrequency:
        candidateCapped === true ? commissionCapFrequency : null,
      commissionCapAmountMinor,
      marketingConsent,
    };
  }

  async function saveProfile() {
    const candidate = buildCandidatePayload();
    const parsedPayload = parseProfileSetupPayload(candidate);
    if (!parsedPayload.data || parsedPayload.error) {
      setError(parsedPayload.error ?? "Profile details are incomplete.");
      return false;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/profile-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedPayload.data),
      });
      const responseBody = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(responseBody.error ?? "Could not save profile setup.");
        return false;
      }

      setIsComplete(true);
      return true;
    } catch {
      setError("Could not save profile setup.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMobileNext() {
    setError(null);
    if (!isFinalMobileStep) {
      setMobileStepIndex((currentStep) =>
        Math.min(currentStep + 1, mobileSteps.length - 1),
      );
      return;
    }

    await saveProfile();
  }

  function handleMobileBack() {
    setError(null);
    setMobileStepIndex((currentStep) => Math.max(currentStep - 1, 0));
  }

  if (isComplete) {
    return <ProfileSetupComplete />;
  }

  const identityFields = (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          placeholder="Jane Smith"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label>Default currency</Label>
        <div className="grid grid-cols-3 gap-2">
          {PROFILE_CURRENCIES.map((currencyCode) => (
            <ChoiceButton
              key={currencyCode}
              label={currencyCode}
              selected={defaultCurrency === currencyCode}
              onClick={() => setDefaultCurrency(currencyCode)}
            />
          ))}
        </div>
      </div>

      <TimezoneCombobox
        id="reporting-timezone"
        label="Reporting timezone"
        value={reportingTimezone}
        onChange={setReportingTimezone}
        required
      />
    </div>
  );

  const chairRentFields = (
    <div className="grid gap-2">
      <Label>Do you pay chair rent?</Label>
      <div className="grid grid-cols-2 gap-2">
        <ChoiceButton
          label="Yes"
          selected={payChairRent === true}
          onClick={() => {
            setPayChairRent(true);
            resetRentDetails(true);
          }}
        />
        <ChoiceButton
          label="No"
          selected={payChairRent === false}
          onClick={() => {
            setPayChairRent(false);
            resetRentDetails(false);
          }}
        />
      </div>
    </div>
  );

  const rentTypeFields = (
    <div className="grid gap-2">
      <Label>Do you pay commission or fixed rate?</Label>
      {payChairRent === false ? (
        <p className="text-sm text-muted-foreground">
          You selected no chair rent. Continue to confirm your setup.
        </p>
      ) : null}
      {payChairRent !== false ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ChoiceButton
            label="Fixed rate"
            selected={rentType === "fixed"}
            onClick={() => {
              setRentType("fixed");
              setCommissionRate("");
              setCommissionCapped(null);
              setCommissionCapFrequency(null);
              setCommissionCapAmount("");
            }}
          />
          <ChoiceButton
            label="Commission"
            selected={rentType === "commission"}
            onClick={() => {
              setRentType("commission");
              setFixedFrequency(null);
              setFixedAmount("");
            }}
          />
        </div>
      ) : null}
    </div>
  );

  const fixedFields = (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Fixed frequency</Label>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceButton
            label="Weekly"
            selected={fixedFrequency === "weekly"}
            onClick={() => setFixedFrequency("weekly")}
          />
          <ChoiceButton
            label="Monthly"
            selected={fixedFrequency === "monthly"}
            onClick={() => setFixedFrequency("monthly")}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="fixed-amount">Fixed amount</Label>
        <Input
          id="fixed-amount"
          type="number"
          min={0}
          step="0.01"
          value={fixedAmount}
          onChange={(event) => setFixedAmount(event.target.value)}
          placeholder="0.00"
        />
      </div>
    </div>
  );

  const commissionFields = (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="commission-rate">Commission percentage</Label>
        <Input
          id="commission-rate"
          type="number"
          min={0.01}
          max={100}
          step="0.01"
          value={commissionRate}
          onChange={(event) => setCommissionRate(event.target.value)}
          placeholder="e.g. 30"
        />
      </div>
      <div className="grid gap-2">
        <Label>Is commission capped?</Label>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceButton
            label="Yes"
            selected={commissionCapped === true}
            onClick={() => setCommissionCapped(true)}
          />
          <ChoiceButton
            label="No"
            selected={commissionCapped === false}
            onClick={() => {
              setCommissionCapped(false);
              setCommissionCapFrequency(null);
              setCommissionCapAmount("");
            }}
          />
        </div>
      </div>
      {commissionCapped ? (
        <>
          <div className="grid gap-2">
            <Label>Cap frequency</Label>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceButton
                label="Weekly"
                selected={commissionCapFrequency === "weekly"}
                onClick={() => setCommissionCapFrequency("weekly")}
              />
              <ChoiceButton
                label="Monthly"
                selected={commissionCapFrequency === "monthly"}
                onClick={() => setCommissionCapFrequency("monthly")}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="commission-cap-amount">Commission cap amount</Label>
            <Input
              id="commission-cap-amount"
              type="number"
              min={0}
              step="0.01"
              value={commissionCapAmount}
              onChange={(event) => setCommissionCapAmount(event.target.value)}
              placeholder="0.00"
            />
          </div>
        </>
      ) : null}
    </div>
  );

  const marketingConsentCheckbox = (
    <div className="flex items-start gap-3">
      <Checkbox
        id="marketing-consent"
        checked={marketingConsent}
        onCheckedChange={(checked) => {
          if (typeof checked === "boolean") setMarketingConsent(checked);
        }}
      />
      <Label htmlFor="marketing-consent" className="cursor-pointer font-normal leading-snug">
        Keep me updated about new features and announcements.
      </Label>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Set up your profile
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Add your setup details to unlock your dashboard analytics.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm lg:hidden">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            Step {mobileStepIndex + 1} of {mobileSteps.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {activeMobileStep === "identity" ? identityFields : null}
          {activeMobileStep === "chairRent" ? chairRentFields : null}
          {activeMobileStep === "rentType" ? rentTypeFields : null}
          {activeMobileStep === "rentDetails" && payChairRent && rentType === "fixed"
            ? fixedFields
            : null}
          {activeMobileStep === "rentDetails" &&
          payChairRent &&
          rentType === "commission"
            ? commissionFields
            : null}
          {activeMobileStep === "rentDetails" && payChairRent === false ? (
            <p className="text-sm text-muted-foreground">
              You&apos;re nearly done. Continue to save your profile setup.
            </p>
          ) : null}
          {activeMobileStep === "rentDetails" ? marketingConsentCheckbox : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              data-testid="mobile-back"
              disabled={mobileStepIndex === 0 || isSubmitting}
              onClick={handleMobileBack}
            >
              Back
            </Button>
            <Button
              type="button"
              data-testid="mobile-next"
              disabled={isNextDisabled}
              onClick={() => void handleMobileNext()}
            >
              {isSubmitting ? "Saving…" : isFinalMobileStep ? "Finish setup" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden border-border bg-card shadow-sm lg:block">
        <CardHeader>
          <CardTitle className="text-xl">Profile setup</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void saveProfile();
            }}
          >
            {identityFields}
            {chairRentFields}
            {payChairRent ? rentTypeFields : null}
            {payChairRent && rentType === "fixed" ? fixedFields : null}
            {payChairRent && rentType === "commission" ? commissionFields : null}

            {marketingConsentCheckbox}

            {error ? (
              <p className={cn("text-sm", "text-destructive")} role="status">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" className="w-full lg:w-auto" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Finish setup"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
