import { deleteExpense, updateExpense } from "@/lib/expenses/expense-db";
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

  const result = await updateExpense(supabase, user.id, expenseId, payload);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (!result.found) {
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

  const result = await deleteExpense(supabase, user.id, expenseId);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: result.deleted });
}
