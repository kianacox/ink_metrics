"use client";

import { useId, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { SessionModalShell } from "@/components/dashboard/session-form/session-modal-shell";

interface ClientCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

export function ClientCreateModal({ open, onClose, onCreated }: ClientCreateModalProps) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setContactInfo("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Client name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, contactInfo: contactInfo.trim() }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not create client.");
        return;
      }

      reset();
      await onCreated();
      onClose();
    } catch {
      setError("Could not create client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SessionModalShell
      open={open}
      titleId={titleId}
      title="New Client"
      description="Add a new client. You can attach them to sessions later."
      onClose={handleClose}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="create-client-name">Client name</Label>
          <Input
            id="create-client-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Smith"
            autoComplete="off"
            aria-required="true"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="create-client-contact">
            Contact info{" "}
            <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="create-client-contact"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="e.g. email or phone"
            autoComplete="off"
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="status">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create client"}
          </Button>
        </div>
      </form>
    </SessionModalShell>
  );
}
