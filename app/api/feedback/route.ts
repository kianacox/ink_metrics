import { NextResponse } from "next/server";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";

export const FEEDBACK_CATEGORIES = [
  "Feature request",
  "Bug report",
  "General feedback",
] as const;
type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

const RATE_LIMIT = 10;
const RATE_WINDOW_HOURS = 24;

function errorJson(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status });
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidCategory(value: unknown): value is FeedbackCategory {
  return (
    typeof value === "string" &&
    (FEEDBACK_CATEGORIES as readonly string[]).includes(value)
  );
}

export async function POST(request: Request) {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to submit feedback.",
  );
  if (errorResponse) return errorResponse;
  if (!user) {
    return errorJson(
      401,
      "FEEDBACK_UNAUTHENTICATED",
      "You must be signed in to submit feedback.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorJson(400, "FEEDBACK_INVALID_BODY", "Invalid request body.");
  }

  const { category, message } = body ?? {};

  if (!isString(message) || !category) {
    return errorJson(
      400,
      "FEEDBACK_MISSING_FIELDS",
      "All fields are required.",
    );
  }

  if (!isValidCategory(category)) {
    return errorJson(400, "FEEDBACK_INVALID_CATEGORY", "Invalid category.");
  }

  const since = new Date(
    Date.now() - RATE_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { count, error: countError } = await supabase
    .from("feedback")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);

  if (countError) {
    return errorJson(
      500,
      "FEEDBACK_RATE_CHECK_FAILED",
      "Could not verify rate limit. Please try again.",
    );
  }

  if ((count ?? 0) >= RATE_LIMIT) {
    return errorJson(
      429,
      "FEEDBACK_RATE_LIMITED",
      "Too many submissions. Please try again later.",
    );
  }

  const { error: insertError } = await supabase.from("feedback").insert({
    user_id: user.id,
    category,
    message: message.trim(),
  });

  if (insertError) {
    return errorJson(
      500,
      "FEEDBACK_INSERT_FAILED",
      "Could not save feedback. Please try again later.",
    );
  }

  return NextResponse.json({ success: true });
}
