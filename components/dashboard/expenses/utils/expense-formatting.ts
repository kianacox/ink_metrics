import { DEFAULT_CURRENCY } from "@/lib/currency";

export function formatExpenseAmount(
  amountMinor: number,
  currencyCode: string = DEFAULT_CURRENCY,
): string {
  const amount = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: DEFAULT_CURRENCY,
    }).format(amount);
  }
}

export function formatPurchaseDate(datePurchased: string): string {
  // datePurchased is a YYYY-MM-DD date string (no time, no timezone)
  // Parse it as local date parts to avoid UTC offset shifting the displayed day
  const [year, month, day] = datePurchased.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
