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
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useId, useState } from "react";

type SubmitStatus = { type: "success" | "error"; message: string } | null;

export function AddSessionModal() {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [sessionLength, setSessionLength] = useState("");
  const [profit, setProfit] = useState("");
  const [status, setStatus] = useState<SubmitStatus>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = useCallback(() => {
    setClientName("");
    setClientContact("");
    setSessionLength("");
    setProfit("");
    setStatus(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

    const name = clientName.trim();
    const contact = clientContact.trim();
    const lengthMinutes = Number.parseInt(sessionLength, 10);
    const price = Number.parseFloat(profit);

    if (!name) {
      setStatus({ type: "error", message: "Client name is required." });
      setIsLoading(false);
      return;
    }
    if (!Number.isFinite(lengthMinutes) || lengthMinutes <= 0) {
      setStatus({
        type: "error",
        message: "Session length must be a positive number (minutes).",
      });
      setIsLoading(false);
      return;
    }
    if (!Number.isFinite(price)) {
      setStatus({ type: "error", message: "Profit must be a valid number." });
      setIsLoading(false);
      return;
    }

    try {
      const { data: existingRows, error: findError } = await supabase
        .from("Clients")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", name)
        .limit(1);

      if (findError) throw findError;

      let clientId = existingRows?.[0]?.id as string | undefined;

      if (!clientId) {
        const { data: inserted, error: insertClientError } = await supabase
          .from("Clients")
          .insert({
            user_id: user.id,
            name,
            contact_info: contact.length > 0 ? contact : null,
          })
          .select("id")
          .single();

        if (insertClientError) throw insertClientError;
        clientId = inserted.id;
      } else if (contact.length > 0) {
        const { error: updateError } = await supabase
          .from("Clients")
          .update({ contact_info: contact })
          .eq("id", clientId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      }

      const { error: sessionError } = await supabase.from("Sessions").insert({
        user_id: user.id,
        client_id: clientId,
        price,
        session_duration: lengthMinutes,
      });

      if (sessionError) throw sessionError;

      setStatus({ type: "success", message: "Session saved successfully." });
      resetForm();
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
      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        onClick={() => setOpen(true)}
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
            <CardHeader className="space-y-1.5 p-4 pb-2 sm:p-6 sm:pb-0">
              <CardTitle id={titleId} className="text-lg sm:text-xl">
                Log a session
              </CardTitle>
              <CardDescription className="text-pretty">
                Client and session details are saved to your workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 sm:p-6 sm:pt-0">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="client-name">Client name</Label>
                  <Input
                    id="client-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client-contact">
                    Client contact{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="client-contact"
                    value={clientContact}
                    onChange={(e) => setClientContact(e.target.value)}
                    placeholder="Email or phone"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="session-length">Session length (minutes)</Label>
                  <Input
                    id="session-length"
                    type="number"
                    min={1}
                    step={1}
                    value={sessionLength}
                    onChange={(e) => setSessionLength(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profit">Profit</Label>
                  <Input
                    id="profit"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={profit}
                    onChange={(e) => setProfit(e.target.value)}
                    required
                  />
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
