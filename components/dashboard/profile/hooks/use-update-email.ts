"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface UpdateEmailResult {
  success: boolean;
  error?: string;
}

export function useUpdateEmail() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateEmail = useCallback(async (newEmail: string): Promise<UpdateEmailResult> => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      );
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch {
      return { success: false, error: "Could not update email address." };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, updateEmail };
}
