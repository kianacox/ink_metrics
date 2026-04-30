"use client";

import type { ClientTier } from "@/lib/clients/tier";

interface TierOption {
  label: string;
  value: ClientTier | null;
}

const TIER_OPTIONS: TierOption[] = [
  { label: "All", value: null },
  { label: "VIP", value: "vip" },
  { label: "Regular", value: "regular" },
  { label: "One-timer", value: "one-timer" },
];

interface ClientTierFilterPillsProps {
  activeTier: ClientTier | null;
  onChange: (tier: ClientTier | null) => void;
}

export function ClientTierFilterPills({
  activeTier,
  onChange,
}: ClientTierFilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TIER_OPTIONS.map(({ label, value }) => {
        const isActive = activeTier === value;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(value)}
            data-active={isActive ? "true" : "false"}
            aria-pressed={isActive}
            className={
              isActive
                ? "inline-flex items-center rounded-none px-3 py-1 text-sm font-medium transition-colors bg-primary text-primary-foreground"
                : "inline-flex items-center rounded-none border border-border bg-transparent px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
