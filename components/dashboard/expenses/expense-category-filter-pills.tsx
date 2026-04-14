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
                  ? "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors bg-primary text-primary-foreground"
                  : "inline-flex items-center rounded-full border border-emerald-600/40 bg-transparent px-3 py-1 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:border-emerald-400/40 dark:text-emerald-300"
              }
              aria-pressed={isActive}
            >
              {EXPENSE_CATEGORY_LABELS[category]}
            </button>
          );
        })}
      </div>
      {selectedCategories.size > 0 ? (
        <button
          type="button"
          onClick={onClearAll}
          className="self-start text-sm text-muted-foreground underline hover:text-foreground"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
