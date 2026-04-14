import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExpenseCreatePayload, ExpenseUpdatePayload } from "@/lib/expenses/models";

// Mapping from camelCase payload keys to snake_case DB column names.
const UPDATE_FIELD_MAP: Record<keyof ExpenseUpdatePayload, string> = {
  item: "item",
  category: "category",
  amountMinor: "amount_minor",
  currencyCode: "currency_code",
  datePurchased: "date_purchased",
  receiptPath: "receipt_path",
  receiptMimeType: "receipt_mime_type",
  receiptSizeBytes: "receipt_size_bytes",
};

export async function createExpense(
  supabase: SupabaseClient,
  userId: string,
  payload: ExpenseCreatePayload,
): Promise<{ expenseId: string } | { error: string }> {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      user_id: userId,
      item: payload.item,
      category: payload.category,
      amount_minor: payload.amountMinor,
      currency_code: payload.currencyCode,
      date_purchased: payload.datePurchased,
    })
    .select("expense_id")
    .single();

  if (error) {
    return { error: "Could not create expense." };
  }

  return { expenseId: data.expense_id as string };
}

export async function updateExpense(
  supabase: SupabaseClient,
  userId: string,
  expenseId: string,
  payload: ExpenseUpdatePayload,
): Promise<{ found: boolean } | { error: string }> {
  const updateObj: Record<string, unknown> = Object.fromEntries(
    (Object.entries(payload) as [keyof ExpenseUpdatePayload, unknown][])
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [UPDATE_FIELD_MAP[k], v]),
  );
  updateObj.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("expenses")
    .update(updateObj)
    .eq("expense_id", expenseId)
    .eq("user_id", userId)
    .select("expense_id");

  if (error) {
    return { error: "Could not update expense." };
  }

  return { found: (data ?? []).length > 0 };
}

export async function deleteExpense(
  supabase: SupabaseClient,
  userId: string,
  expenseId: string,
): Promise<{ deleted: boolean } | { error: string }> {
  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .eq("expense_id", expenseId)
    .eq("user_id", userId)
    .select("expense_id");

  if (error) {
    return { error: "Could not delete expense." };
  }

  return { deleted: (data ?? []).length > 0 };
}
