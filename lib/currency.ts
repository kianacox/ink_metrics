export const DEFAULT_CURRENCY = "GBP";

export function toMinorUnits(value: string | number): number {
  const amount =
    typeof value === "number" ? value : Number.parseFloat(value.trim());

  if (!Number.isFinite(amount)) {
    throw new Error("Amount must be a valid number.");
  }

  if (amount < 0) {
    throw new Error("Amount must be zero or greater.");
  }

  return Math.round(amount * 100);
}
