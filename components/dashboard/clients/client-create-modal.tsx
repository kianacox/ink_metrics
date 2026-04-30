"use client";

import { useId, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { SessionModalShell } from "@/components/dashboard/session-form/session-modal-shell";
import { useCreateClient } from "@/components/dashboard/clients/hooks/use-client-mutations";

interface ClientCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function ClientCreateModal({ open, onClose, onCreated }: ClientCreateModalProps) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
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

  const { mutate, isPending } = useCreateClient({
    onSuccess: () => {
      reset();
      onCreated();
      onClose();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Client name is required.");
      return;
    }

    mutate({ name: trimmedName, contactInfo: contactInfo.trim() });
  };

  return (
    <SessionModalShell
      open={open}
      titleId={titleId}
      title="New Client"
      description="Add a new client. You can attach them to sessions later."
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
            {isPending ? "Creating..." : "Create client"}
          </Button>
        </div>
      </form>
    </SessionModalShell>
  );
}
