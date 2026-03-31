"use client";

import { DEFAULT_CURRENCY } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";
import type { ClientOption } from "@/components/dashboard/session-form/utils/client-selection";

interface SaveSessionParams {
  selectedClientId: string | null;
  createNewClient: boolean;
  clientName: string;
  clientContact: string;
  priceMinor: number;
  sessionDurationMinutes: number;
}

interface SaveSessionResult {
  success: boolean;
  message?: string;
}

export function useSessionFormData(open: boolean) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState(DEFAULT_CURRENCY);
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
            .select("default_currency")
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
    }: SaveSessionParams): Promise<SaveSessionResult> => {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return {
          success: false,
          message: "You must be signed in to log a session.",
        };
      }

      let clientId = selectedClientId;

      if (createNewClient) {
        const { data: duplicateRows, error: duplicateError } = await supabase
          .from("clients")
          .select("client_id")
          .eq("user_id", user.id)
          .eq("name", clientName)
          .limit(1);

        if (duplicateError) {
          return { success: false, message: duplicateError.message };
        }

        if (duplicateRows?.[0]?.client_id) {
          return {
            success: false,
            message: "A client with this name already exists. Choose it from Existing client.",
          };
        }

        const newClientId = crypto.randomUUID();
        const { data: inserted, error: insertClientError } = await supabase
          .from("clients")
          .insert({
            client_id: newClientId,
            user_id: user.id,
            name: clientName,
            contact_info: clientContact.length > 0 ? clientContact : null,
          })
          .select("client_id")
          .single();

        if (insertClientError) {
          return { success: false, message: insertClientError.message };
        }

        const insertedClientId = inserted.client_id;
        if (!insertedClientId) {
          return { success: false, message: "Could not create the new client." };
        }

        clientId = insertedClientId;

        setClients((prevClients) => {
          const exists = prevClients.some(
            (client) => client.client_id === insertedClientId,
          );
          if (exists) {
            return prevClients;
          }

          return [
            ...prevClients,
            {
              client_id: insertedClientId,
              name: clientName,
            },
          ].sort((a, b) => a.name.localeCompare(b.name));
        });
      }

      if (!clientId) {
        return { success: false, message: "Select an existing client before saving." };
      }

      const { error: sessionError } = await supabase.from("sessions").insert({
        session_id: crypto.randomUUID(),
        user_id: user.id,
        client_id: clientId,
        price: priceMinor,
        session_duration: sessionDurationMinutes,
      });

      if (sessionError) {
        return { success: false, message: sessionError.message };
      }

      return { success: true };
    },
    [],
  );

  return {
    clients,
    isClientsLoading,
    defaultCurrency,
    loadError,
    saveSession,
  };
}
