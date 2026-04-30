import { Resend } from "resend";

const FROM_ADDRESS = "inkMetrics <noreply@inkmetrics.app>";
const SUPPORT_ADDRESS = "support@inkmetrics.app";

export interface ContactEmailPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/**
 * Sends a contact-form enquiry to the inkMetrics support inbox via Resend.
 * Throws if Resend returns an error so callers can surface a 500.
 */
export async function sendContactEmail({
  name,
  email,
  subject,
  message,
}: ContactEmailPayload): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: SUPPORT_ADDRESS,
    replyTo: email,
    subject: `[Contact] ${subject} — from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
  });

  if (error) {
    throw new Error(error.message);
  }
}
