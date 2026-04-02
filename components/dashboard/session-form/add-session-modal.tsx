"use client";
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
import { cn } from "@/lib/utils";
import {
  getFilteredClients,
  isDuplicateClientName,
  normalizeClientName,
} from "@/components/dashboard/session-form/utils/client-selection";
import { useSessionFormData } from "@/components/dashboard/session-form/hooks/use-session-form-data";
import { validateSessionForm } from "@/components/dashboard/session-form/utils/session-form-validation";
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
  const {
    clients,
    isClientsLoading,
    defaultCurrency,
    loadError,
    saveSession,
  } = useSessionFormData(open);

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
    if (loadError) {
      setStatus({ type: "error", message: loadError });
    }
  }, [loadError]);

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

    const normalizedNewClientContact = newClientContact.trim();
    const clientId = selectedClientId;
    const validationResult = validateSessionForm({
      selectedClientId: clientId,
      createNewClient,
      clientName: normalizedClientName,
      hours,
      minutes,
      profit,
      clients,
    });
    if (!validationResult.valid) {
      setStatus({ type: "error", message: validationResult.errorMessage });
      setIsLoading(false);
      return;
    }

    try {
      const result = await saveSession({
        selectedClientId: clientId,
        createNewClient,
        clientName: validationResult.normalizedClientName,
        clientContact: normalizedNewClientContact,
        priceMinor: validationResult.priceMinor,
        sessionDurationMinutes: validationResult.sessionDurationMinutes,
      });

      if (!result.success) {
        setStatus({
          type: "error",
          message: result.message ?? "Could not save session.",
        });
        setIsLoading(false);
        return;
      }

      setOpen(false);
      resetForm();
      setToast({ message: "Session saved successfully." });
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
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
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
                      (type to search existing or create new)
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
                      placeholder="Type client name to search or create"
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
                  <Label htmlFor="profit">Price</Label>
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
