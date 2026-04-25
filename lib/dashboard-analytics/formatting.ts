import { DEFAULT_CURRENCY } from "@/lib/currency";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function sanitizeFiniteNumber(value: number): number {
  if (!isFiniteNumber(value)) {
    return 0;
  }

  if (Object.is(value, -0)) {
    return 0;
  }

  return value;
}

export function formatMinorAsCurrency(minor: number, currencyCode = DEFAULT_CURRENCY): string {
  const safeMinor = sanitizeFiniteNumber(minor);
  const amount = safeMinor / 100;

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(rate: number): string {
  const safeRate = sanitizeFiniteNumber(rate);
  const clampedRate = Math.min(Math.max(safeRate, 0), 1);

  return new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(clampedRate);
}

export function formatHours(totalHours: number): string {
  const safeHours = sanitizeFiniteNumber(totalHours);
  const roundedHours = Math.round(safeHours * 10) / 10;

  return `${roundedHours}h`;
}
