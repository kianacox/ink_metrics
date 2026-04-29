export type ClientTier = "vip" | "regular" | "one-timer";

export const TIER_THRESHOLDS = {
  VIP_MIN: 5,
  REGULAR_MIN: 2,
} as const;

export function getClientTier(lifetimeSessionCount: number): ClientTier {
  if (lifetimeSessionCount >= TIER_THRESHOLDS.VIP_MIN) return "vip";
  if (lifetimeSessionCount >= TIER_THRESHOLDS.REGULAR_MIN) return "regular";
  return "one-timer";
}
