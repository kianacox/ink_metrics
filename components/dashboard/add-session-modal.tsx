"use client";

import { createClient } from "@/lib/supabase/client";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";
import { DEFAULT_CURRENCY, toMinorUnits } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  getFilteredClients,
  isDuplicateClientName,
  normalizeClientName,
  validateDuration,
  type ClientOption,
} from "@/components/dashboard/add-session-modal.logic";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

type SubmitStatus = { type: "success" | "error"; message: string } | null;
type ToastStatus = { message: string } | null;

export function AddSessionModal() {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [newClientContact, setNewClientContact] = useState("");
  const [createNewClient, setCreateNewClient] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [profit, setProfit] = useState("");
  const [status, setStatus] = useState<SubmitStatus>(null);
  const [toast, setToast] = useState<ToastStatus>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState(DEFAULT_CURRENCY);

  const resetForm = useCallback((preserveStatus = false) => {
    setClientQuery("");
    setSelectedClientId(null);
    setNewClientContact("");
    setCreateNewClient(false);
    setHours("");
    setMinutes("");
    setProfit("");
    if (!preserveStatus) {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;
    const loadClients = async () => {
      setIsClientsLoading(true);
      setStatus(null);
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (isMounted) {
          setStatus({
            type: "error",
            message: "You must be signed in to log a session.",
          });
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
        setStatus({
          type: "error",
          message: "Could not load form data. Please try again.",
        });
        setIsClientsLoading(false);
        return;
      }

      setClients((clientRows ?? []) as ClientOption[]);
      setDefaultCurrency(profileRows?.[0]?.default_currency ?? DEFAULT_CURRENCY);
      setIsClientsLoading(false);
    };

    void loadClients();

    return () => {
      isMounted = false;
    };
  }, [open]);

  const filteredClients = useMemo(
    () => getFilteredClients(clients, clientQuery),
    [clients, clientQuery],
  );

  const normalizedClientName = normalizeClientName(clientQuery);
  const showClientDropdown =
    normalizedClientName.length >= 1 && !selectedClientId && !createNewClient;
  const shouldShowCreateOption =
    showClientDropdown && !isDuplicateClientName(clients, normalizedClientName);
  const currencySymbol = useMemo(() => {
    try {
      const currencyPart = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: defaultCurrency,
      })
        .formatToParts(0)
        .find((part) => part.type === "currency");
      return currencyPart?.value ?? defaultCurrency;
    } catch {
      return defaultCurrency;
    }
  }, [defaultCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setIsLoading(true);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatus({ type: "error", message: "You must be signed in to log a session." });
      setIsLoading(false);
      return;
    }

    const normalizedNewClientContact = newClientContact.trim();
    const durationResult = validateDuration(hours, minutes);

    let priceMinor = 0;
    let clientId = selectedClientId;

    if (!durationResult.valid) {
      setStatus({ type: "error", message: durationResult.errorMessage });
      setIsLoading(false);
      return;
    }

    if (!clientId && !createNewClient) {
      setStatus({
        type: "error",
        message: "Select an existing client or create a new one before saving.",
      });
      setIsLoading(false);
      return;
    }

    if (createNewClient && !normalizedClientName) {
      setStatus({ type: "error", message: "Client name is required for a new client." });
      setIsLoading(false);
      return;
    }

    if (createNewClient && isDuplicateClientName(clients, normalizedClientName)) {
      setStatus({
        type: "error",
        message: "A client with this name already exists. Choose it from Existing client.",
      });
      setIsLoading(false);
      return;
    }

    try {
      priceMinor = toMinorUnits(profit);
    } catch {
      setStatus({ type: "error", message: "Profit must be a valid number." });
      setIsLoading(false);
      return;
    }

    try {
      if (createNewClient) {
        const { data: duplicateRows, error: duplicateError } = await supabase
          .from("clients")
          .select("client_id")
          .eq("user_id", user.id)
          .eq("name", normalizedClientName)
          .limit(1);

        if (duplicateError) {
          throw duplicateError;
        }
        if (duplicateRows?.[0]?.client_id) {
          setStatus({
            type: "error",
            message: "A client with this name already exists. Choose it from Existing client.",
          });
          setIsLoading(false);
          return;
        }

        const newClientId = crypto.randomUUID();
        const { data: inserted, error: insertClientError } = await supabase
          .from("clients")
          .insert({
            client_id: newClientId,
            user_id: user.id,
            name: normalizedClientName,
            contact_info:
              normalizedNewClientContact.length > 0 ? normalizedNewClientContact : null,
          })
          .select("client_id")
          .single();

        if (insertClientError) {
          throw insertClientError;
        }
        const insertedClientId = inserted.client_id;
        if (!insertedClientId) {
          setStatus({ type: "error", message: "Could not create the new client." });
          setIsLoading(false);
          return;
        }
        clientId = insertedClientId;

        setClients((prevClients) => {
          const existingClient = prevClients.find(
            (client) => client.client_id === insertedClientId,
          );
          if (existingClient) {
            return prevClients;
          }
          return [
            ...prevClients,
            {
              client_id: insertedClientId,
              name: normalizedClientName,
            },
          ].sort((a, b) => a.name.localeCompare(b.name));
        });
      }

      if (!clientId) {
        setStatus({ type: "error", message: "Select an existing client before saving." });
        setIsLoading(false);
        return;
      }

      const { error: sessionError } = await supabase.from("sessions").insert({
        session_id: crypto.randomUUID(),
        user_id: user.id,
        client_id: clientId,
        price: priceMinor,
        session_duration: durationResult.totalMinutes,
      });

      if (sessionError) {
        throw sessionError;
      }

      setOpen(false);
      resetForm();
      setToast({ message: "Session saved successfully." });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not save session.";
      setStatus({ type: "error", message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {toast ? (
        <div
          className="fixed right-4 top-4 z-[60] max-w-xs rounded-md border border-border bg-background px-4 py-3 text-sm shadow-lg sm:right-6 sm:top-6"
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}
      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        onClick={() => {
          setOpen(true);
          setStatus(null);
        }}
      >
        Add session
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <Card
            className={cn(
              "max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-1rem))] w-full overflow-y-auto rounded-b-none rounded-t-2xl border-border shadow-lg sm:max-h-[min(90dvh,40rem)] sm:max-w-md sm:rounded-xl",
              "pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:pt-0",
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden"
              aria-hidden
            />
            <CardHeader className="space-y-1.5 p-4 pb-3 sm:p-6 sm:pb-3">
              <CardTitle id={titleId} className="text-lg sm:text-xl">
                Log a session
              </CardTitle>
              <CardDescription className="text-pretty">
                Client and session details are saved to your workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1 sm:p-6 sm:pt-1">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid gap-2 pb-1">
                  <Label htmlFor="client-combobox">
                    Client{" "}
                    <span className="text-muted-foreground font-normal">
                      (type at least 1 character)
                    </span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="client-combobox"
                      value={clientQuery}
                      onChange={(e) => {
                        setClientQuery(e.target.value);
                        setSelectedClientId(null);
                        setCreateNewClient(false);
                      }}
                      placeholder="Search by client name"
                      autoComplete="off"
                      required
                    />
                    {showClientDropdown ? (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-border bg-background shadow-lg">
                        {isClientsLoading ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">Loading clients…</p>
                        ) : (
                          <>
                            {filteredClients.length > 0 ? (
                              <ul className="max-h-40 overflow-y-auto py-1">
                                {filteredClients.map((client) => (
                                  <li key={client.client_id}>
                                    <button
                                      type="button"
                                      className={cn(
                                        "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                                        selectedClientId === client.client_id
                                          ? "bg-accent text-accent-foreground"
                                          : "",
                                      )}
                                      onClick={() => {
                                        setSelectedClientId(client.client_id);
                                        setCreateNewClient(false);
                                        setClientQuery(client.name);
                                        setStatus(null);
                                      }}
                                    >
                                      Use existing: {client.name}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="px-3 py-2 text-sm text-muted-foreground">
                                No matching clients found.
                              </p>
                            )}
                            {shouldShowCreateOption ? (
                              <button
                                type="button"
                                className={cn(
                                  "w-full border-t border-border px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                                  createNewClient ? "bg-accent text-accent-foreground" : "",
                                )}
                                onClick={() => {
                                  setSelectedClientId(null);
                                  setCreateNewClient(true);
                                  setClientQuery(normalizedClientName);
                                  setStatus(null);
                                }}
                              >
                                Create new client: {normalizedClientName}
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {selectedClientId ? (
                    <p className="text-xs text-muted-foreground">Existing client selected.</p>
                  ) : null}
                  {createNewClient ? (
                    <p className="text-xs text-muted-foreground">
                      New client will be created when you save this session.
                    </p>
                  ) : null}
                </div>
                {createNewClient ? (
                  <div className="grid gap-2">
                    <Label htmlFor="client-contact">
                      Client contact{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="client-contact"
                      value={newClientContact}
                      onChange={(e) => setNewClientContact(e.target.value)}
                      placeholder="Email or phone"
                    />
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label>Session length</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="session-hours" className="text-muted-foreground">
                        Hours
                      </Label>
                      <Input
                        id="session-hours"
                        type="number"
                        min={0}
                        step={1}
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="session-minutes" className="text-muted-foreground">
                        Minutes
                      </Label>
                      <Input
                        id="session-minutes"
                        type="number"
                        min={0}
                        max={59}
                        step={1}
                        value={minutes}
                        onChange={(e) => setMinutes(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profit">Profit</Label>
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                      aria-hidden
                    >
                      {currencySymbol}
                    </span>
                    <Input
                      id="profit"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={profit}
                      onChange={(e) => setProfit(e.target.value)}
                      className="pl-8"
                      required
                    />
                  </div>
                </div>

                {status ? (
                  <p
                    className={
                      status.type === "success"
                        ? "text-sm text-primary"
                        : "text-sm text-destructive"
                    }
                    role="status"
                  >
                    {status.message}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving…" : "Save session"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
