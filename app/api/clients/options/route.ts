import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to list clients.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to list clients." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("clients")
    .select("client_id,name")
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: "Could not load clients." }, { status: 500 });
  }

  return NextResponse.json({ clients: data ?? [] });
}
