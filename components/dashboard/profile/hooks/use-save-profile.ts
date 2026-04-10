"use client";

import { useCallback, useState } from "react";
import type {
  SaveProfileApiResponse,
  SaveProfilePayload,
  SaveProfileResult,
} from "@/components/dashboard/profile/models";
export type { SaveProfilePayload, SaveProfileResult };

export function useSaveProfile() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveProfile = useCallback(async (payload: SaveProfilePayload): Promise<SaveProfileResult> => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const responseBody = (await response.json()) as SaveProfileApiResponse;
      if (!response.ok) {
        return {
          success: false,
          error: responseBody.error ?? "Could not save profile changes.",
        };
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: "Could not save profile changes.",
      };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    isSubmitting,
    saveProfile,
  };
}
