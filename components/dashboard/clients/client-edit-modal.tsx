"use client";

import { useEffect, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, Label } from "@/components/ui";
import { SessionModalShell } from "@/components/dashboard/session-form/session-modal-shell";
import type { ClientListItem } from "@/lib/clients/models";

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
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, contactInfo: contactInfo.trim() }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not update client.");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      onUpdated();
      onClose();
    } catch {
      setError("Could not update client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SessionModalShell
      open={open}
      titleId={titleId}
      title="Edit Client"
      description="Update this client's name or contact information."
      onClose={onClose}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
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
            disabled={isSubmitting}
          >
            Close
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </SessionModalShell>
  );
}
