import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return <ForgotPasswordForm />;
}
