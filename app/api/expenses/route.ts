import { createExpense } from "@/lib/expenses/expense-db";
import { parseExpenseCreatePayload } from "@/lib/expenses/expense-write";
import { fetchExpensesPage } from "@/lib/expenses/fetch-expenses-page";
import { EXPENSE_CATEGORIES } from "@/lib/expenses/models";
import { CursorDecodeError, decodeCompositeCursor } from "@/lib/pagination/cursor";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { NextResponse } from "next/server";

const DEFAULT_LIMIT = 25;
const DEFAULT_DATE_RANGE: SessionDateRangePreset = "last90Days";

const VALID_DATE_RANGES = new Set<SessionDateRangePreset>([
  "last30Days",
  "last90Days",
  "yearToDate",
  "allTime",
]);

function errorJson(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status });
}

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

  const rawDateRange = params.get("dateRange") ?? DEFAULT_DATE_RANGE;
  const dateRange: SessionDateRangePreset = VALID_DATE_RANGES.has(rawDateRange as SessionDateRangePreset)
    ? (rawDateRange as SessionDateRangePreset)
    : DEFAULT_DATE_RANGE;
  const reportingTimezone = params.get("tz") ?? "UTC";

  const limit = Math.max(
    1,
    Math.min(
      100,
      Number.parseInt(params.get("limit") ?? String(DEFAULT_LIMIT), 10) ||
        DEFAULT_LIMIT,
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
      return errorJson(400, "EXPENSES_CURSOR_INVALID", error.message);
    }
    return errorJson(500, "EXPENSES_FETCH_FAILED", "Could not load expenses.");
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
    return errorJson(500, "EXPENSE_CREATE_FAILED", "Could not create expense.");
  }

  return NextResponse.json({ success: true, expenseId: result.expenseId });
}
