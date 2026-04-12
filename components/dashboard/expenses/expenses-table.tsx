import { Button } from "@/components/ui";
import {
  formatExpenseAmount,
  formatPurchaseDate,
} from "@/components/dashboard/expenses/utils/expense-formatting";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expenses/models";
import type { ExpenseListItem } from "@/lib/expenses/models";
import { Paperclip, Pencil, Trash2 } from "lucide-react";

interface ExpensesTableProps {
  expenses: ExpenseListItem[];
  currencyCode: string;
  onEditExpense: (expense: ExpenseListItem) => void;
  onDeleteExpense: (expense: ExpenseListItem) => void;
}

export function ExpensesTable({
  expenses,
  currencyCode,
  onEditExpense,
  onDeleteExpense,
}: ExpensesTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
      <table className="w-full border-collapse">
        <thead className="bg-muted/40">
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Receipt</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} className="border-t border-border">
              <td className="px-4 py-3 text-sm font-medium text-foreground">
                {expense.item}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {EXPENSE_CATEGORY_LABELS[expense.category]}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatPurchaseDate(expense.datePurchased)}
              </td>
              <td className="px-4 py-3 text-sm text-foreground">
                {formatExpenseAmount(expense.amountMinor, currencyCode)}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {expense.receiptPath ? (
                  <Paperclip aria-label="Receipt attached" className="size-4" />
                ) : (
                  <span aria-label="No receipt">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onEditExpense(expense)}
                    aria-label={`Edit expense: ${expense.item}`}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onDeleteExpense(expense)}
                    aria-label={`Delete expense: ${expense.item}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
