import { createClient } from "@/lib/supabase/server";
import { bootstrapUserProfile } from "@/lib/profiles/bootstrap-user-profile";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export type AuthConfirmErrorCode =
  | "missing_token_or_type"
  | "otp_verification_failed"
  | "verified_user_missing";

const SAFE_NEXT_QUERY_KEYS = new Set<string>([]);

function redirectToAuthError(code: AuthConfirmErrorCode): never {
  redirect(`/auth/error?code=${code}`);
}

export function safeNextPath(next: string | null): string {
  if (!next) return "/dashboard";

  const [rawPath = ""] = next.split("?");
  if (!rawPath.startsWith("/") || rawPath.startsWith("//")) return "/dashboard";
  if (rawPath.includes("://")) return "/dashboard";

  // Strip arbitrary query params by default. Only explicitly allowed keys survive.
  const parsedUrl = new URL(next, "http://localhost");
  const allowedSearchParams = new URLSearchParams();

  for (const [key, value] of parsedUrl.searchParams.entries()) {
    if (SAFE_NEXT_QUERY_KEYS.has(key)) {
      allowedSearchParams.append(key, value);
    }
  }

  const query = allowedSearchParams.toString();
  return query.length > 0 ? `${rawPath}?${query}` : rawPath;
}

export function shouldBootstrapVerifiedUser(type: EmailOtpType): boolean {
  return type !== "email_change";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();

    const { data: otpData, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      if (!shouldBootstrapVerifiedUser(type)) {
        redirect(next);
      }

      const verifiedUserId = otpData.user?.id;

      if (!verifiedUserId) {
        redirectToAuthError("verified_user_missing");
      }

      await bootstrapUserProfile({
        supabase,
        userId: verifiedUserId,
        source: "auth_confirm_route",
      });

      redirect(next);
    } else {
      redirectToAuthError("otp_verification_failed");
    }
  }

  redirectToAuthError("missing_token_or_type");
}
