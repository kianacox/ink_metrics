"use client";

import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getDefaultReportingTimezone } from "@/lib/timezones";
import { useCallback, useEffect, useState } from "react";
import type {
  ClientOption,
  SaveSessionApiResponse,
  SaveSessionParams,
  SaveSessionResult,
} from "@/components/dashboard/session-form/models";

interface PreferencesApiResponse {
  defaultCurrency: string;
  reportingTimezone: string;
  displayAdvertCheckbox: boolean;
}

interface ClientOptionsApiResponse {
  clients: ClientOption[];
}

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

      const [prefsRes, clientsRes] = await Promise.all([
        fetch("/api/preferences"),
        fetch("/api/clients/options"),
      ]);

      if (!isMounted) {
        return;
      }

      if (!prefsRes.ok || !clientsRes.ok) {
        setLoadError("Could not load form data. Please try again.");
        setIsClientsLoading(false);
        return;
      }

      const [prefsData, clientsData] = await Promise.all([
        prefsRes.json() as Promise<PreferencesApiResponse>,
        clientsRes.json() as Promise<ClientOptionsApiResponse>,
      ]);

      if (!isMounted) {
        return;
      }

      setClients(clientsData.clients ?? []);
      setDefaultCurrency(prefsData.defaultCurrency ?? DEFAULT_CURRENCY);
      setReportingTimezone(prefsData.reportingTimezone ?? getDefaultReportingTimezone());
      setDisplayAdvertCheckbox(prefsData.displayAdvertCheckbox === true);
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
