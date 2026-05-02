import { errorJson } from "@/lib/api-response";
import { DEFAULT_PAGE_LIMIT } from "@/lib/constants";
import { createExpense } from "@/lib/expenses/expense-db";
import {
  filterValidExpenseCategories,
  parseExpenseDateRange,
} from "@/lib/expenses/expense-query-params";
import { parseExpenseCreatePayload } from "@/lib/expenses/expense-write";
import { fetchExpensesPage } from "@/lib/expenses/fetch-expenses-page";
import { CursorDecodeError, decodeCompositeCursor } from "@/lib/pagination/cursor";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

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

  const categories = filterValidExpenseCategories(params.getAll("category"));
  const dateRange = parseExpenseDateRange(params.get("dateRange"));
  const reportingTimezone = params.get("tz") ?? "UTC";

  const limit = Math.max(
    1,
    Math.min(
      100,
      Number.parseInt(params.get("limit") ?? String(DEFAULT_PAGE_LIMIT), 10) ||
        DEFAULT_PAGE_LIMIT,
    ),
  );
  const cursorParam = params.get("cursor");

  try {
    const cursor = decodeCompositeCursor(cursorParam);
    const result = await fetchExpensesPage({
      supabase,
      userId: user.id,
      categories,
      dateRange,
      reportingTimezone,
      cursor,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CursorDecodeError) {
      return errorJson(error.message, "EXPENSES_CURSOR_INVALID", 400);
    }
    return errorJson("Could not load expenses.", "EXPENSES_FETCH_FAILED", 500);
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
    return errorJson("Could not create expense.", "EXPENSE_CREATE_FAILED", 500);
  }

  return NextResponse.json({ success: true, expenseId: result.expenseId });
}
