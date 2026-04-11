"use client";

import { useState } from "react";
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
import { useUpdateEmail } from "@/components/dashboard/profile/hooks/use-update-email";
import { DeleteAccountModal } from "@/components/dashboard/profile/delete-account-modal";

interface ProfileSettingsViewProps {
  currentEmail: string;
}

export function ProfileSettingsView({ currentEmail }: ProfileSettingsViewProps) {
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const { isSubmitting: isUpdatingEmail, updateEmail } = useUpdateEmail();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailStatus(null);

    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setEmailStatus({ type: "error", message: "This is already your current email address." });
      return;
    }

    const result = await updateEmail(newEmail);
    if (!result.success) {
      setEmailStatus({ type: "error", message: result.error ?? "Could not update email." });
      return;
    }
    setEmailStatus({
      type: "success",
      message: "Check your inbox — a confirmation link has been sent to your new address.",
    });
    setNewEmail("");
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Email address</CardTitle>
          <CardDescription>
            Update the email address associated with your account. Your address
            will not change until you click the confirmation link sent to the
            new address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={(event) => void handleEmailSubmit(event)}>
            <div className="grid gap-2">
              <Label htmlFor="settings-current-email">Current email address</Label>
              <p
                id="settings-current-email"
                className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
              >
                {currentEmail}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-new-email">New email address</Label>
              <Input
                id="settings-new-email"
                type="email"
                placeholder="you@example.com"
                required
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="grid gap-2">
              <div className="min-h-4">
                {emailStatus ? (
                  <p
                    className={cn(
                      "text-sm",
                      emailStatus.type === "success" ? "text-primary" : "text-destructive",
                    )}
                    role="status"
                  >
                    {emailStatus.message}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="w-full sm:w-auto" disabled={isUpdatingEmail}>
                  {isUpdatingEmail ? "Sending..." : "Send confirmation"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-destructive sm:text-xl">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete account
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
