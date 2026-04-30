import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendContactEmail } from "@/lib/contact/send-contact-email";

export const VALID_SUBJECTS = ["Billing", "Bug", "Partnership", "Other"] as const;
type ValidSubject = (typeof VALID_SUBJECTS)[number];

const RATE_LIMIT = 5;
const RATE_WINDOW_HOURS = 1;

function errorJson(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status });
}

function getClientIp(request: Request): string | null {
  const header = request.headers.get("x-forwarded-for");
  if (!header) return null;
  const first = header.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidSubject(value: unknown): value is ValidSubject {
  return (
    typeof value === "string" &&
    (VALID_SUBJECTS as readonly string[]).includes(value)
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorJson(400, "CONTACT_INVALID_BODY", "Invalid request body.");
  }

  const { name, email, subject, message } = body ?? {};

  if (!isString(name) || !isString(email) || !isString(message) || !subject) {
    return errorJson(
      400,
      "CONTACT_MISSING_FIELDS",
      "All fields are required.",
    );
  }

  if (!isValidSubject(subject)) {
    return errorJson(400, "CONTACT_INVALID_SUBJECT", "Invalid subject.");
  }

  const ip = getClientIp(request);
  const supabase = createAdminClient();

  const since = new Date(
    Date.now() - RATE_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  if (ip) {
    const { count, error: countError } = await supabase
      .from("contact_submissions")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", since);

    if (countError) {
      return errorJson(
        500,
        "CONTACT_RATE_CHECK_FAILED",
        "Could not verify rate limit. Please try again.",
      );
    }

    if ((count ?? 0) >= RATE_LIMIT) {
      return errorJson(
        429,
        "CONTACT_RATE_LIMITED",
        "Too many submissions. Please try again later.",
      );
    }
  }

  try {
    await sendContactEmail({
      name: name.trim(),
      email: email.trim(),
      subject,
      message: message.trim(),
    });
  } catch {
    return errorJson(
      500,
      "CONTACT_SEND_FAILED",
      "Could not send your message. Please try again later.",
    );
  }

  const { error: insertError } = await supabase
    .from("contact_submissions")
    .insert({
      name: name.trim(),
      email: email.trim(),
      subject,
      message: message.trim(),
      ip_address: ip,
    });

  if (insertError) {
    // The email already sent — surface a non-fatal warning but treat as success.
    return NextResponse.json({ success: true, logged: false });
  }

  return NextResponse.json({ success: true });
}
