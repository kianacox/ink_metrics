"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
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
  isSupportedTimezone,
} from "@/lib/timezones";
import { TimezoneCombobox } from "@/components/shared/timezone-combobox";
import { ChoiceButton } from "@/components/dashboard/profile/components/choice-button";
import {
  toInputAmount,
  toInputPercentFromBps,
} from "@/components/dashboard/profile/utils/profile-input-formatting";
import { useSaveProfile } from "@/components/dashboard/profile/hooks/use-save-profile";

interface ProfileEditFormProps {
  initialDisplayName: string;
  initialDefaultCurrency: ProfileCurrency;
  initialReportingTimezone: string;
  initialPayChairRent: boolean;
  initialRentType: RentType | null;
  initialFixedFrequency: RentFrequency | null;
  initialFixedAmountMinor: number | null;
  initialCommissionRateBps: number | null;
  initialCommissionCapped: boolean | null;
  initialCommissionCapFrequency: RentFrequency | null;
  initialCommissionCapAmountMinor: number | null;
}

export function ProfileEditForm({
  initialDisplayName,
  initialDefaultCurrency,
  initialReportingTimezone,
  initialPayChairRent,
  initialRentType,
  initialFixedFrequency,
  initialFixedAmountMinor,
  initialCommissionRateBps,
  initialCommissionCapped,
  initialCommissionCapFrequency,
  initialCommissionCapAmountMinor,
}: ProfileEditFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [defaultCurrency] = useState<ProfileCurrency>(initialDefaultCurrency);
  const [reportingTimezone, setReportingTimezone] = useState(() => {
    if (isSupportedTimezone(initialReportingTimezone)) {
      return initialReportingTimezone;
    }

    return detectBrowserTimezone() ?? "Europe/London";
  });
  const [payChairRent, setPayChairRent] = useState<boolean>(initialPayChairRent);
  const [rentType, setRentType] = useState<RentType | null>(initialRentType);
  const [fixedFrequency, setFixedFrequency] = useState<RentFrequency | null>(initialFixedFrequency);
  const [fixedAmount, setFixedAmount] = useState(toInputAmount(initialFixedAmountMinor));
  const [commissionRate, setCommissionRate] = useState(
    toInputPercentFromBps(initialCommissionRateBps),
  );
  const [commissionCapped, setCommissionCapped] = useState<boolean | null>(initialCommissionCapped);
  const [commissionCapFrequency, setCommissionCapFrequency] =
    useState<RentFrequency | null>(initialCommissionCapFrequency);
  const [commissionCapAmount, setCommissionCapAmount] = useState(
    toInputAmount(initialCommissionCapAmountMinor),
  );
  const { isSubmitting, saveProfile } = useSaveProfile();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function resetRentDetails(nextPayChairRent: boolean) {
    if (!nextPayChairRent) {
      setRentType(null);
      setFixedFrequency(null);
      setFixedAmount("");
      setCommissionRate("");
      setCommissionCapped(null);
      setCommissionCapFrequency(null);
      setCommissionCapAmount("");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const candidateRentType = payChairRent ? rentType : null;
    const fixedAmountMinor = candidateRentType === "fixed" ? toMinorAmount(fixedAmount) : null;
    const commissionRateBps =
      candidateRentType === "commission" ? toBps(commissionRate) : null;
    const candidateCapped = candidateRentType === "commission" ? commissionCapped : null;
    const commissionCapAmountMinor =
      candidateCapped === true ? toMinorAmount(commissionCapAmount) : null;

    const parsedPayload = parseProfileSetupPayload({
      displayName,
      defaultCurrency,
      reportingTimezone,
      payChairRent,
      rentType: candidateRentType,
      fixedFrequency: candidateRentType === "fixed" ? fixedFrequency : null,
      fixedAmountMinor,
      commissionRateBps,
      commissionCapped: candidateCapped,
      commissionCapFrequency: candidateCapped === true ? commissionCapFrequency : null,
      commissionCapAmountMinor,
    });

    if (!parsedPayload.data || parsedPayload.error) {
      setStatus({
        type: "error",
        message: parsedPayload.error ?? "Profile data is invalid.",
      });
      return;
    }

    setStatus(null);
    const result = await saveProfile({
      displayName: parsedPayload.data.displayName,
      reportingTimezone: parsedPayload.data.reportingTimezone,
      payChairRent: parsedPayload.data.payChairRent,
      rentType: parsedPayload.data.rentType,
      fixedFrequency: parsedPayload.data.fixedFrequency,
      fixedAmountMinor: parsedPayload.data.fixedAmountMinor,
      commissionRateBps: parsedPayload.data.commissionRateBps,
      commissionCapped: parsedPayload.data.commissionCapped,
      commissionCapFrequency: parsedPayload.data.commissionCapFrequency,
      commissionCapAmountMinor: parsedPayload.data.commissionCapAmountMinor,
    });
    if (!result.success) {
      setStatus({
        type: "error",
        message: result.error ?? "Could not save profile changes.",
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Profile updated successfully.",
    });
  }

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Edit profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="profile-display-name">Name</Label>
            <Input
              id="profile-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Default currency</Label>
            <div className="grid grid-cols-3 gap-2">
              {PROFILE_CURRENCIES.map((currency) => (
                <ChoiceButton
                  key={currency}
                  label={currency}
                  selected={defaultCurrency === currency}
                  disabled
                  className={cn(
                    defaultCurrency === currency
                      ? "bg-primary text-primary-foreground opacity-80"
                      : "border-input bg-muted text-muted-foreground opacity-100",
                    "hover:bg-muted hover:text-muted-foreground",
                  )}
                  onClick={() => {
                    // Currency is intentionally immutable after profile setup.
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Default currency is locked after setup.
            </p>
          </div>

          <TimezoneCombobox
            id="profile-reporting-timezone"
            label="Reporting timezone"
            value={reportingTimezone}
            onChange={setReportingTimezone}
            required
          />

          <div className="grid gap-2">
            <Label>Do you pay chair rent?</Label>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceButton
                label="Yes"
                selected={payChairRent === true}
                onClick={() => setPayChairRent(true)}
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

          {payChairRent ? (
            <div className="grid gap-2">
              <Label>Do you pay commission or fixed rate?</Label>
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
            </div>
          ) : null}

          {payChairRent && rentType === "fixed" ? (
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
                <Label htmlFor="profile-fixed-amount">Fixed amount</Label>
                <Input
                  id="profile-fixed-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={fixedAmount}
                  onChange={(event) => setFixedAmount(event.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          ) : null}

          {payChairRent && rentType === "commission" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="profile-commission-rate">Commission percentage</Label>
                <Input
                  id="profile-commission-rate"
                  type="number"
                  min={0.01}
                  max={100}
                  step="0.01"
                  value={commissionRate}
                  onChange={(event) => setCommissionRate(event.target.value)}
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
                    <Label htmlFor="profile-commission-cap-amount">Commission cap amount</Label>
                    <Input
                      id="profile-commission-cap-amount"
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
          ) : null}

          <div className="min-h-5">
            {status ? (
              <p
                className={cn(
                  "text-sm",
                  status.type === "success" ? "text-primary" : "text-destructive",
                )}
                role="status"
              >
                {status.message}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
