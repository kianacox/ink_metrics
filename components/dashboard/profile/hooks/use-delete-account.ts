"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DeleteAccountApiResponse, DeleteAccountResult } from "@/components/dashboard/profile/models";

export function useDeleteAccount() {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const deleteAccount = useCallback(async (): Promise<DeleteAccountResult> => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const body = (await response.json()) as DeleteAccountApiResponse;
      if (!response.ok) {
        return { success: false, error: body.error ?? "Could not delete account." };
      }

      // Sign out client-side after successful server-side deletion
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");

      return { success: true };
    } catch {
      return { success: false, error: "Could not delete account." };
    } finally {
      setIsDeleting(false);
    }
  }, [router]);

  return { isDeleting, deleteAccount };
}
