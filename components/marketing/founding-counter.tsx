const FOUNDING_LIMIT = 50;

export interface FoundingCounterProps {
  count: number;
  isFull: boolean;
}

export function FoundingCounter({ count, isFull }: FoundingCounterProps) {
  const label = isFull
    ? `Founding spots full — ${FOUNDING_LIMIT} founding members joined`
    : `${count} of ${FOUNDING_LIMIT} founding spots taken`;

  return (
    <div className="w-full">
      <progress
        value={count}
        max={FOUNDING_LIMIT}
        aria-label={label}
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted/40 [&::-webkit-progress-bar]:bg-muted/40 [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
      />
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
