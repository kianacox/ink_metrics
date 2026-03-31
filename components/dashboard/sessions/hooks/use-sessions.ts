"use client";

import { DEFAULT_CURRENCY } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";
import {
  mapSessionRowsToListItems,
  type SessionRow,
} from "@/components/dashboard/sessions/utils/session-formatting";
import type { SessionListItem } from "@/components/dashboard/sessions/utils/session-listing";

interface UseSessionsResult {
  sessions: SessionListItem[];
  defaultCurrency: string;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useSessions(): UseSessionsResult {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You must be signed in to view sessions.");
      setSessions([]);
      setIsLoading(false);
      return;
    }

    const [{ data: sessionRows, error: sessionsError }, { data: profileRows, error: profileError }] =
      await Promise.all([
        supabase
          .from("sessions")
          .select("session_id,price,session_duration,created_at,clients(name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("default_currency")
          .eq("user_id", user.id)
          .limit(1),
      ]);

    if (sessionsError || profileError) {
      setError("Could not load sessions. Please try again.");
      setSessions([]);
      setIsLoading(false);
      return;
    }

    const mappedSessions = mapSessionRowsToListItems(
      ((sessionRows ?? []) as SessionRow[]),
    );
    setSessions(mappedSessions);
    setDefaultCurrency(profileRows?.[0]?.default_currency ?? DEFAULT_CURRENCY);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    sessions,
    defaultCurrency,
    isLoading,
    error,
    reload: load,
  };
}
