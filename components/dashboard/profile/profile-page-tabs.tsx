"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProfileEditForm } from "@/components/dashboard/profile/profile-edit-form";
import { ProfileSettingsView } from "@/components/dashboard/profile/profile-settings-view";
import type { ProfileCurrency, RentFrequency, RentType } from "@/lib/profiles/profile-setup";

type ProfileTab = "profile" | "settings";

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "settings", label: "Settings" },
];

interface ProfilePageTabsProps {
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

export function ProfilePageTabs({
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
}: ProfilePageTabsProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div
        role="tablist"
        aria-label="Profile sections"
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
            onClick={() => setActiveTab(tab.id)}
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
        id="tabpanel-profile"
        aria-labelledby="tab-profile"
        hidden={activeTab !== "profile"}
      >
        {activeTab === "profile" ? (
          <ProfileEditForm
            initialDisplayName={initialDisplayName}
            initialDefaultCurrency={initialDefaultCurrency}
            initialReportingTimezone={initialReportingTimezone}
            initialPayChairRent={initialPayChairRent}
            initialRentType={initialRentType}
            initialFixedFrequency={initialFixedFrequency}
            initialFixedAmountMinor={initialFixedAmountMinor}
            initialCommissionRateBps={initialCommissionRateBps}
            initialCommissionCapped={initialCommissionCapped}
            initialCommissionCapFrequency={initialCommissionCapFrequency}
            initialCommissionCapAmountMinor={initialCommissionCapAmountMinor}
          />
        ) : null}
      </div>

      <div
        role="tabpanel"
        id="tabpanel-settings"
        aria-labelledby="tab-settings"
        hidden={activeTab !== "settings"}
      >
        {activeTab === "settings" ? <ProfileSettingsView /> : null}
      </div>
    </div>
  );
}
