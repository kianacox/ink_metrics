export function toInputAmount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "";
  }

  return (value / 100).toFixed(2);
}

export function toInputPercentFromBps(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "";
  }

  return (value / 100).toFixed(2);
}
