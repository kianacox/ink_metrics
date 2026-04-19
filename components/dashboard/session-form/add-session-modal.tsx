"use client";
import {
  Button,
  Input,
  Label,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatDateTimeLocalForTimezone, getDefaultReportingTimezone } from "@/lib/timezones";
import {
  getFilteredClients,
  isDuplicateClientName,
  normalizeClientName,
} from "@/components/dashboard/session-form/utils/client-selection";
import { useSessionFormData } from "@/components/dashboard/session-form/hooks/use-session-form-data";
import { validateSessionForm } from "@/components/dashboard/session-form/utils/session-form-validation";
import { SessionEditableFields } from "@/components/dashboard/session-form/session-editable-fields";
import { SessionModalShell } from "@/components/dashboard/session-form/session-modal-shell";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Info } from "lucide-react";

type SubmitStatus = { type: "success" | "error"; message: string } | null;
type ToastStatus = { message: string } | null;

function createDefaultSessionDateTimeValue(reportingTimezone: string): string {
  const now = new Date();
  return formatDateTimeLocalForTimezone(now, reportingTimezone);
}

interface AddSessionModalProps {
  /** When provided, the component operates in controlled mode and hides its internal trigger button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called after a session is saved successfully. */
  onSaved?: () => void;
}

export function AddSessionModal({ open: controlledOpen, onOpenChange, onSaved }: AddSessionModalProps = {}) {
  const titleId = useId();
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (value: boolean) => {
      if (isControlled) {
        onOpenChange?.(value);
      } else {
        setInternalOpen(value);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isControlled],
  );
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [newClientContact, setNewClientContact] = useState("");
  const [createNewClient, setCreateNewClient] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [profit, setProfit] = useState("");
  const [throughAds, setThroughAds] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const {
    clients,
    isClientsLoading,
    defaultCurrency,
    reportingTimezone,
    displayAdvertCheckbox,
    loadError,
    saveSession,
  } = useSessionFormData(open);
  const [sessionDateTime, setSessionDateTime] = useState(() =>
    createDefaultSessionDateTimeValue(getDefaultReportingTimezone()),
  );
  const [status, setStatus] = useState<SubmitStatus>(null);
  const [toast, setToast] = useState<ToastStatus>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = useCallback((preserveStatus = false) => {
    setClientQuery("");
    setSelectedClientId(null);
    setNewClientContact("");
    setCreateNewClient(false);
    setHours("");
    setMinutes("");
    setProfit("");
    setThroughAds(false);
    setInProgress(false);
    setSessionDateTime(createDefaultSessionDateTimeValue(reportingTimezone));
    if (!preserveStatus) {
      setStatus(null);
    }
  }, [reportingTimezone]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

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
    setSessionDateTime(createDefaultSessionDateTimeValue(reportingTimezone));
  }, [open, reportingTimezone]);

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
      sessionAtLocal: sessionDateTime,
      reportingTimezone,
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
        sessionAtIso: validationResult.sessionAtIso,
        throughAds: displayAdvertCheckbox && createNewClient ? throughAds : null,
        inProgress,
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
      onSaved?.();
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
      {!isControlled ? (
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => {
            setOpen(true);
            setStatus(null);
            setSessionDateTime(createDefaultSessionDateTimeValue(reportingTimezone));
          }}
        >
          Add session
        </Button>
      ) : null}

      {open ? (
        <SessionModalShell
          open={open}
          titleId={titleId}
          title="Log a session"
          description="Client and session details are saved to your workspace."
          onClose={() => setOpen(false)}
        >
          <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4">
                <p className="flex items-center gap-2 rounded-md border border-sky-400/60 bg-sky-500/10 px-3 py-2 text-xs text-sky-800 dark:border-sky-300/60 dark:bg-sky-400/20 dark:text-sky-100">
                  <Info aria-hidden="true" className="size-4 shrink-0" />
                  <span>You can backdate sessions by up to 6 months.</span>
                </p>
                <div className="grid min-w-0 gap-2 pb-1">
                  <Label htmlFor="client-combobox">
                    Client{" "}
                    <span className="text-muted-foreground font-normal">
                      (type to search existing or create new)
                    </span>
                  </Label>
                  <div className="relative min-w-0">
                    <Input
                      id="client-combobox"
                      value={clientQuery}
                      onChange={(e) => {
                        setClientQuery(e.target.value);
                        setSelectedClientId(null);
                        setCreateNewClient(false);
                        setThroughAds(false);
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
                                        setThroughAds(false);
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
                                  setThroughAds(false);
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
                  <div className="grid min-w-0 gap-2">
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

                <SessionEditableFields
                  fieldIdPrefix="create"
                  hours={hours}
                  minutes={minutes}
                  sessionDateTime={sessionDateTime}
                  profit={profit}
                  currencyCode={defaultCurrency}
                  inProgress={inProgress}
                  onHoursChange={setHours}
                  onMinutesChange={setMinutes}
                  onSessionDateTimeChange={setSessionDateTime}
                  onProfitChange={setProfit}
                  onInProgressChange={setInProgress}
                />
                {displayAdvertCheckbox && createNewClient ? (
                  <div className="flex items-start gap-2 rounded-md border border-border px-3 py-2">
                    <input
                      id="through-ads"
                      type="checkbox"
                      checked={throughAds}
                      onChange={(event) => setThroughAds(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border border-input"
                    />
                    <Label htmlFor="through-ads" className="cursor-pointer leading-5">
                      Through Ads?
                    </Label>
                  </div>
                ) : null}

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
        </SessionModalShell>
      ) : null}
    </>
  );
}
