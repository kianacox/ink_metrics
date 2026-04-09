"use client";

import { useCallback, useState } from "react";

export interface SaveProfilePayload {
  displayName: string;
  reportingTimezone: string;
  payChairRent: boolean;
  rentType: "fixed" | "commission" | null;
  fixedFrequency: "weekly" | "monthly" | null;
  fixedAmountMinor: number | null;
  commissionRateBps: number | null;
  commissionCapped: boolean | null;
  commissionCapFrequency: "weekly" | "monthly" | null;
  commissionCapAmountMinor: number | null;
}

interface SaveProfileResult {
  success: boolean;
  error?: string;
}

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
      const responseBody = (await response.json()) as { error?: string };
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
