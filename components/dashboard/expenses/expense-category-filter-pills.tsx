"use client";

import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/expenses/models";

interface ExpenseCategoryFilterPillsProps {
  selectedCategories: Set<string>;
  onToggle: (category: string) => void;
  onClearAll: () => void;
}

export function ExpenseCategoryFilterPills({
  selectedCategories,
  onToggle,
  onClearAll,
}: ExpenseCategoryFilterPillsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {EXPENSE_CATEGORIES.map((category) => {
          const isActive = selectedCategories.has(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => onToggle(category)}
              className={
                isActive
                  ? "inline-flex items-center rounded-none px-3 py-1 text-sm font-medium transition-colors bg-primary text-primary-foreground"
                  : "inline-flex items-center rounded-none border border-border bg-transparent px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              }
              aria-pressed={isActive}
            >
              {EXPENSE_CATEGORY_LABELS[category]}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onClearAll}
        className={`self-start text-sm text-muted-foreground underline hover:text-foreground ${selectedCategories.size === 0 ? "invisible" : ""}`}
        aria-hidden={selectedCategories.size === 0}
        tabIndex={selectedCategories.size === 0 ? -1 : undefined}
      >
        Clear all
      </button>
    </div>
  );
}
