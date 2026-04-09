"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface ChoiceButtonProps {
  selected: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function ChoiceButton({
  selected,
  label,
  onClick,
  disabled = false,
  className,
}: ChoiceButtonProps) {
  return (
    <Button
      type="button"
      variant={selected ? "default" : "outline"}
      className={cn("w-full", className)}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}
