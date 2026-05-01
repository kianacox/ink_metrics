"use client";

import { useState } from "react";
import { Button, Label } from "@/components/ui";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS = [
  "Feature request",
  "Bug report",
  "General feedback",
] as const;
type CategoryOption = (typeof CATEGORY_OPTIONS)[number];

interface FieldErrors {
  category?: string;
  message?: string;
}

function validate({
  category,
  message,
}: {
  category: string;
  message: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!category) errors.category = "Please select a category.";
  if (!message.trim()) errors.message = "Message is required.";
  return errors;
}

export function FeedbackForm() {
  const [category, setCategory] = useState<CategoryOption | "">("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const validation = validate({ category, message });
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        return;
      }

      const payload = await response.json().catch(() => ({}));
      if (response.status === 429) {
        setServerError(
          payload.error ?? "Too many submissions. Please try again later.",
        );
      } else if (response.status === 400) {
        setServerError(
          payload.error ?? "Please check your input and try again.",
        );
      } else if (response.status === 401) {
        setServerError(
          payload.error ?? "Your session expired. Please sign in again.",
        );
      } else {
        setServerError(
          payload.error ??
            "Something went wrong sending your feedback. Please try again.",
        );
      }
    } catch {
      setServerError(
        "Could not reach the server. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-xl py-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Share feedback
          </h1>
          <p className="mt-3 text-muted-foreground">
            Tell us what&apos;s working, what&apos;s not, or what you&apos;d
            love to see next. We read every message.
          </p>
        </header>

        {submitted ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-foreground">
              Thanks — we&apos;ve got your feedback.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We appreciate you taking the time to share. If you reported a
              bug or made a request, we may follow up by email.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="space-y-2">
              <Label htmlFor="feedback-category">Category</Label>
              <select
                id="feedback-category"
                name="category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as CategoryOption | "")
                }
                aria-invalid={Boolean(errors.category)}
                aria-describedby={
                  errors.category ? "feedback-category-error" : undefined
                }
                required
                className={cn(
                  "flex min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "sm:min-h-9 sm:py-1 sm:focus-visible:ring-1 md:text-sm",
                )}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.category ? (
                <p
                  id="feedback-category-error"
                  className="text-sm text-destructive"
                >
                  {errors.category}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">Message</Label>
              <textarea
                id="feedback-message"
                name="message"
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={
                  errors.message ? "feedback-message-error" : undefined
                }
                required
                className={cn(
                  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "sm:focus-visible:ring-1 md:text-sm",
                )}
              />
              {errors.message ? (
                <p
                  id="feedback-message-error"
                  className="text-sm text-destructive"
                >
                  {errors.message}
                </p>
              ) : null}
            </div>

            {serverError ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {serverError}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending..." : "Send feedback"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </MarketingLayout>
  );
}
