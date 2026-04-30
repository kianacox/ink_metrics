"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";

interface MonthNavigatorProps {
  monthLabel: string;
  year: number;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export function MonthNavigator({
  monthLabel,
  year,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: MonthNavigatorProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label="Previous month"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </Button>
      <span className="min-w-[10rem] text-center text-sm font-medium text-foreground sm:text-base">
        {monthLabel} {year}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next month"
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
