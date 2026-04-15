import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import {
  formatExpenseAmount,
  formatPurchaseDate,
} from "@/components/dashboard/expenses/utils/expense-formatting";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expenses/models";
import type { ExpenseListItem } from "@/lib/expenses/models";
import { Paperclip } from "lucide-react";

interface ExpensesCardsProps {
  expenses: ExpenseListItem[];
  currencyCode: string;
  onEditExpense: (expense: ExpenseListItem) => void;
  onDeleteExpense: (expense: ExpenseListItem) => void;
}

export function ExpensesCards({
  expenses,
  currencyCode,
  onEditExpense,
  onDeleteExpense,
}: ExpensesCardsProps) {
  return (
    <div className="grid min-w-0 gap-3 sm:hidden">
      {expenses.map((expense) => (
        <Card key={expense.id} className="w-full border-border">
          <CardHeader className="p-4 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="mb-1.5 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {EXPENSE_CATEGORY_LABELS[expense.category]}
                </span>
                <CardTitle className="truncate text-base">{expense.item}</CardTitle>
              </div>
              <div className="flex w-full shrink-0 justify-end gap-1 min-[360px]:w-auto">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/70 text-emerald-700 hover:border-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-800 dark:border-emerald-400/70 dark:text-emerald-300 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
                  onClick={() => onEditExpense(expense)}
                  aria-label={`Edit expense: ${expense.item}`}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteExpense(expense)}
                  aria-label={`Delete expense: ${expense.item}`}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-sm font-medium text-foreground">
                {formatExpenseAmount(expense.amountMinor, currencyCode)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date purchased</p>
              <p className="text-sm font-medium text-foreground">
                {formatPurchaseDate(expense.datePurchased)}
              </p>
            </div>
            {expense.receiptPath ? (
              <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip aria-hidden="true" className="size-3" />
                <span>Receipt attached</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
