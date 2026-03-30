import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

function safeNextPath(next: string | null): string {
  if (!next) return "/dashboard";
  const path = next.split("?")[0] ?? next;
  if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  if (path.includes("://")) return "/dashboard";
  return next;
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
      const verifiedUserId = otpData.user?.id;

      if (!verifiedUserId) {
        redirect("/auth/error?error=Could not determine verified user.");
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          profile_id: crypto.randomUUID(),
          user_id: verifiedUserId,
          default_currency: DEFAULT_CURRENCY,
        },
        { onConflict: "user_id", ignoreDuplicates: true },
      );

      if (profileError) {
        redirect(`/auth/error?error=${profileError.message}`);
      }

      redirect(next);
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${error?.message}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`);
}
