import { createExpense } from "@/lib/expenses/expense-db";
import { parseExpenseCreatePayload } from "@/lib/expenses/expense-write";
import { fetchExpensesPage } from "@/lib/expenses/fetch-expenses-page";
import { EXPENSE_CATEGORIES } from "@/lib/expenses/models";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

const DEFAULT_PAGE_SIZE = 25;

export async function GET(request: Request) {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to list expenses.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to list expenses." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  const rawCategories = params.getAll("category");
  const categories = rawCategories.filter((c) =>
    EXPENSE_CATEGORIES.includes(c as (typeof EXPENSE_CATEGORIES)[number]),
  );

  const pageIndex = Math.max(0, Number.parseInt(params.get("page") ?? "0", 10) || 0);
  const pageSize = Math.max(
    1,
    Math.min(
      100,
      Number.parseInt(params.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) ||
        DEFAULT_PAGE_SIZE,
    ),
  );

  try {
    const result = await fetchExpensesPage({
      supabase,
      userId: user.id,
      categories,
      pageIndex,
      pageSize,
    });

    return NextResponse.json({
      expenses: result.rows,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
      currentMonthTotalMinor: result.currentMonthTotalMinor,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load expenses.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to create an expense.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to create an expense." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { data: payload, error: payloadError } = parseExpenseCreatePayload(body);
  if (!payload || payloadError) {
    return NextResponse.json(
      { error: payloadError ?? "Expense payload is invalid." },
      { status: 400 },
    );
  }

  const result = await createExpense(supabase, user.id, payload);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, expenseId: result.expenseId });
}
