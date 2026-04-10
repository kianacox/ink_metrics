"use client";

import { DEFAULT_CURRENCY } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { getDefaultReportingTimezone, getEffectiveReportingTimezone } from "@/lib/timezones";
import { useCallback, useRef, useState } from "react";
import type {
  LoadedSessionPreferences,
  UseSessionPreferencesResult,
} from "@/components/dashboard/sessions/models";

export function useSessionPreferences(): UseSessionPreferencesResult {
  const [defaultCurrency, setDefaultCurrency] = useState(DEFAULT_CURRENCY);
  const [reportingTimezone, setReportingTimezone] = useState(getDefaultReportingTimezone());
  const userIdRef = useRef<string | null>(null);
  const defaultCurrencyRef = useRef(DEFAULT_CURRENCY);
  const reportingTimezoneRef = useRef(getDefaultReportingTimezone());
  const didLoadProfilePreferencesRef = useRef(false);

  const getUserId = useCallback(async () => {
    if (userIdRef.current) {
      return userIdRef.current;
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be signed in to view sessions.");
    }

    userIdRef.current = user.id;
    return user.id;
  }, []);

  const ensureLoaded = useCallback(async (): Promise<LoadedSessionPreferences> => {
    const userId = await getUserId();
    if (didLoadProfilePreferencesRef.current) {
      return {
        userId,
        defaultCurrency: defaultCurrencyRef.current,
        reportingTimezone: reportingTimezoneRef.current,
      };
    }

    const supabase = createClient();
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("default_currency,reporting_timezone")
      .eq("user_id", userId)
      .limit(1);

    const nextDefaultCurrency = profileRows?.[0]?.default_currency ?? DEFAULT_CURRENCY;
    const candidateTimezone = profileRows?.[0]?.reporting_timezone;
    const nextReportingTimezone = getEffectiveReportingTimezone(candidateTimezone);

    if (!profileError) {
      setDefaultCurrency(nextDefaultCurrency);
      setReportingTimezone(nextReportingTimezone);
      defaultCurrencyRef.current = nextDefaultCurrency;
      reportingTimezoneRef.current = nextReportingTimezone;
      didLoadProfilePreferencesRef.current = true;
    }

    return {
      userId,
      defaultCurrency: nextDefaultCurrency,
      reportingTimezone: nextReportingTimezone,
    };
  }, [getUserId]);

  const getCurrentReportingTimezone = useCallback(() => reportingTimezoneRef.current, []);

  return {
    defaultCurrency,
    reportingTimezone,
    ensureLoaded,
    getCurrentReportingTimezone,
  };
}
