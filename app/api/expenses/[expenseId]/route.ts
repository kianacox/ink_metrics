import { parseExpenseUpdatePayload } from "@/lib/expenses/expense-write";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidExpenseId(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ expenseId: string }> },
) {
  const { expenseId } = await context.params;
  if (!isValidExpenseId(expenseId)) {
    return NextResponse.json({ error: "Expense id is invalid." }, { status: 400 });
  }

  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to update an expense.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to update an expense." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { data: payload, error: payloadError } = parseExpenseUpdatePayload(body);
  if (!payload || payloadError) {
    return NextResponse.json(
      { error: payloadError ?? "Expense update payload is invalid." },
      { status: 400 },
    );
  }

  // Build the DB update object from validated payload fields
  const updateObj: Record<string, unknown> = {};
  if (payload.item !== undefined) updateObj.item = payload.item;
  if (payload.category !== undefined) updateObj.category = payload.category;
  if (payload.amountMinor !== undefined) updateObj.amount_minor = payload.amountMinor;
  if (payload.currencyCode !== undefined) updateObj.currency_code = payload.currencyCode;
  if (payload.datePurchased !== undefined) updateObj.date_purchased = payload.datePurchased;
  if (payload.receiptPath !== undefined) updateObj.receipt_path = payload.receiptPath;
  if (payload.receiptMimeType !== undefined) updateObj.receipt_mime_type = payload.receiptMimeType;
  if (payload.receiptSizeBytes !== undefined) updateObj.receipt_size_bytes = payload.receiptSizeBytes;
  updateObj.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("expenses")
    .update(updateObj)
    .eq("expense_id", expenseId)
    .eq("user_id", user.id)
    .select("expense_id");

  if (error) {
    return NextResponse.json({ error: "Could not update expense." }, { status: 500 });
  }

  if ((data ?? []).length === 0) {
    return NextResponse.json({ error: "Expense was not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ expenseId: string }> },
) {
  const { expenseId } = await context.params;
  if (!isValidExpenseId(expenseId)) {
    return NextResponse.json({ error: "Expense id is invalid." }, { status: 400 });
  }

  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to delete an expense.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to delete an expense." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .eq("expense_id", expenseId)
    .eq("user_id", user.id)
    .select("expense_id");

  if (error) {
    return NextResponse.json({ error: "Could not delete expense." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    deleted: (data ?? []).length > 0,
  });
}
