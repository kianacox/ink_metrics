import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RequireAuthenticatedApiUserResult {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User | null;
  errorResponse: NextResponse<{ error: string }> | null;
}

export async function requireAuthenticatedApiUser(errorMessage: string): Promise<RequireAuthenticatedApiUserResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
      errorResponse: NextResponse.json({ error: errorMessage }, { status: 401 }),
    };
  }

  return {
    supabase,
    user,
    errorResponse: null,
  };
}
