"use client";

import { useEffect, useId, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { SessionModalShell } from "@/components/dashboard/session-form/session-modal-shell";
import type { ClientListItem } from "@/lib/clients/models";
import { useUpdateClient } from "@/components/dashboard/clients/hooks/use-client-mutations";

interface ClientEditModalProps {
  open: boolean;
  client: ClientListItem | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function ClientEditModal({
  open,
  client,
  onClose,
  onUpdated,
}: ClientEditModalProps) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useUpdateClient({
    onSuccess: () => {
      onUpdated();
      onClose();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  useEffect(() => {
    if (!open || !client) {
      return;
    }
    setName(client.name);
    setContactInfo(client.contactInfo ?? "");
    setError(null);
  }, [open, client]);

  if (!open || !client) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Client name is required.");
      return;
    }

    mutate({ id: client.id, name: trimmedName, contactInfo: contactInfo.trim() });
  };

  return (
    <SessionModalShell
      open={open}
      titleId={titleId}
      title="Edit Client"
      description="Update this client's name or contact information."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="edit-client-name">Client name</Label>
          <Input
            id="edit-client-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            aria-required="true"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-client-contact">
            Contact info{" "}
            <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="edit-client-contact"
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
            onClick={onClose}
            disabled={isPending}
          >
            Close
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </SessionModalShell>
  );
}
