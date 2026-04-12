import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

export async function DELETE() {
  const { user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to delete your account.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to delete your account." },
      { status: 401 },
    );
  }

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json(
        { error: "Could not delete account." },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Could not delete account." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
