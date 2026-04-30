"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { cn } from "@/lib/utils";

const SUBJECT_OPTIONS = ["Billing", "Bug", "Partnership", "Other"] as const;
type SubjectOption = (typeof SUBJECT_OPTIONS)[number];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

function validate({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = "Name is required.";
  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = "Please enter a valid email address.";
  }
  if (!subject) errors.subject = "Please select a subject.";
  if (!message.trim()) errors.message = "Message is required.";
  return errors;
}

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<SubjectOption | "">("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const validation = validate({ name, email, subject, message });
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
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
          payload.error ??
            "Too many submissions. Please try again later.",
        );
      } else if (response.status === 400) {
        setServerError(
          payload.error ?? "Please check your input and try again.",
        );
      } else {
        setServerError(
          payload.error ??
            "Something went wrong sending your message. Please try again.",
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
            Contact us
          </h1>
          <p className="mt-3 text-muted-foreground">
            Questions, bug reports, or partnership enquiries — drop us a line
            and we&apos;ll get back to you.
          </p>
        </header>

        {submitted ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-foreground">
              Thanks — we&apos;ve got your message.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We aim to reply within a couple of working days. If it&apos;s
              urgent, you can also email{" "}
              <a
                href="mailto:support@inkmetrics.app"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                support@inkmetrics.app
              </a>
              .
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "contact-name-error" : undefined}
                autoComplete="name"
                required
              />
              {errors.name ? (
                <p
                  id="contact-name-error"
                  className="text-sm text-destructive"
                >
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email ? "contact-email-error" : undefined
                }
                autoComplete="email"
                required
              />
              {errors.email ? (
                <p
                  id="contact-email-error"
                  className="text-sm text-destructive"
                >
                  {errors.email}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-subject">Subject</Label>
              <select
                id="contact-subject"
                name="subject"
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value as SubjectOption | "")
                }
                aria-invalid={Boolean(errors.subject)}
                aria-describedby={
                  errors.subject ? "contact-subject-error" : undefined
                }
                required
                className={cn(
                  "flex min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "sm:min-h-9 sm:py-1 sm:focus-visible:ring-1 md:text-sm",
                )}
              >
                <option value="" disabled>
                  Select a subject
                </option>
                {SUBJECT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.subject ? (
                <p
                  id="contact-subject-error"
                  className="text-sm text-destructive"
                >
                  {errors.subject}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <textarea
                id="contact-message"
                name="message"
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={
                  errors.message ? "contact-message-error" : undefined
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
                  id="contact-message-error"
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
                {submitting ? "Sending..." : "Send message"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </MarketingLayout>
  );
}
