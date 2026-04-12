"use client";

import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getDefaultReportingTimezone } from "@/lib/timezones";
import { useCallback, useRef, useState } from "react";
import type {
  LoadedSessionPreferences,
  UseSessionPreferencesResult,
} from "@/components/dashboard/sessions/models";

interface PreferencesApiResponse {
  defaultCurrency: string;
  reportingTimezone: string;
}

export function useSessionPreferences(): UseSessionPreferencesResult {
  const [defaultCurrency, setDefaultCurrency] = useState(DEFAULT_CURRENCY);
  const [reportingTimezone, setReportingTimezone] = useState(getDefaultReportingTimezone());
  const defaultCurrencyRef = useRef(DEFAULT_CURRENCY);
  const reportingTimezoneRef = useRef(getDefaultReportingTimezone());
  const didLoadProfilePreferencesRef = useRef(false);

  const ensureLoaded = useCallback(async (): Promise<LoadedSessionPreferences> => {
    if (didLoadProfilePreferencesRef.current) {
      return {
        defaultCurrency: defaultCurrencyRef.current,
        reportingTimezone: reportingTimezoneRef.current,
      };
    }

    const res = await fetch("/api/preferences");
    if (!res.ok) {
      throw new Error("Could not load session preferences.");
    }

    const data = (await res.json()) as PreferencesApiResponse;
    const nextDefaultCurrency = data.defaultCurrency ?? DEFAULT_CURRENCY;
    const nextReportingTimezone = data.reportingTimezone ?? getDefaultReportingTimezone();

    setDefaultCurrency(nextDefaultCurrency);
    setReportingTimezone(nextReportingTimezone);
    defaultCurrencyRef.current = nextDefaultCurrency;
    reportingTimezoneRef.current = nextReportingTimezone;
    didLoadProfilePreferencesRef.current = true;

    return {
      defaultCurrency: nextDefaultCurrency,
      reportingTimezone: nextReportingTimezone,
    };
  }, []);

  const getCurrentReportingTimezone = useCallback(() => reportingTimezoneRef.current, []);

  return {
    defaultCurrency,
    reportingTimezone,
    ensureLoaded,
    getCurrentReportingTimezone,
  };
}
