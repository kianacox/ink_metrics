"use client";

import { DEFAULT_CURRENCY } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { getDefaultReportingTimezone, getEffectiveReportingTimezone } from "@/lib/timezones";
import { useCallback, useEffect, useState } from "react";
import type {
  ClientOption,
  SaveSessionApiResponse,
  SaveSessionParams,
  SaveSessionResult,
} from "@/components/dashboard/session-form/models";

export function useSessionFormData(open: boolean) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState(DEFAULT_CURRENCY);
  const [reportingTimezone, setReportingTimezone] = useState(getDefaultReportingTimezone());
  const [displayAdvertCheckbox, setDisplayAdvertCheckbox] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsClientsLoading(true);
      setLoadError(null);

      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (isMounted) {
          setLoadError("You must be signed in to log a session.");
          setIsClientsLoading(false);
        }
        return;
      }

      const [{ data: clientRows, error: clientsError }, { data: profileRows, error: profileError }] =
        await Promise.all([
          supabase
            .from("clients")
            .select("client_id,name")
            .eq("user_id", user.id)
            .order("name", { ascending: true }),
          supabase
            .from("profiles")
            .select("default_currency,reporting_timezone,display_advert_checkbox")
            .eq("user_id", user.id)
            .limit(1),
        ]);

      if (!isMounted) {
        return;
      }

      if (clientsError || profileError) {
        setLoadError("Could not load form data. Please try again.");
        setIsClientsLoading(false);
        return;
      }

      setClients((clientRows ?? []) as ClientOption[]);
      setDefaultCurrency(profileRows?.[0]?.default_currency ?? DEFAULT_CURRENCY);
      const candidateTimezone = profileRows?.[0]?.reporting_timezone;
      setReportingTimezone(getEffectiveReportingTimezone(candidateTimezone));
      setDisplayAdvertCheckbox(profileRows?.[0]?.display_advert_checkbox === true);
      setIsClientsLoading(false);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [open]);

  const saveSession = useCallback(
    async ({
      selectedClientId,
      createNewClient,
      clientName,
      clientContact,
      priceMinor,
      sessionDurationMinutes,
      sessionAtIso,
      throughAds,
    }: SaveSessionParams): Promise<SaveSessionResult> => {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedClientId,
          createNewClient,
          clientName,
          clientContact,
          priceMinor,
          sessionDurationMinutes,
          sessionAtIso,
          throughAds,
        }),
      });
      const responseBody = (await response.json()) as SaveSessionApiResponse;
      if (!response.ok) {
        return {
          success: false,
          message: responseBody.error ?? "Could not save session.",
        };
      }

      const createdClient = responseBody.client;
      if (createdClient?.client_id && createdClient.name) {
        setClients((prevClients) => {
          const exists = prevClients.some((client) => client.client_id === createdClient.client_id);
          if (exists) {
            return prevClients;
          }

          return [...prevClients, createdClient].sort((a, b) => a.name.localeCompare(b.name));
        });
      }

      return { success: true };
    },
    [],
  );

  return {
    clients,
    isClientsLoading,
    defaultCurrency,
    reportingTimezone,
    displayAdvertCheckbox,
    loadError,
    saveSession,
  };
}
