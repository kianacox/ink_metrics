import type { ClientCreatePayload, ClientUpdatePayload } from "@/lib/clients/models";

export type { ClientCreatePayload, ClientUpdatePayload };

export function parseClientCreatePayload(input: unknown): {
  data: ClientCreatePayload | null;
  error: string | null;
} {
  if (!input || typeof input !== "object") {
    return { data: null, error: "Client payload is invalid." };
  }

  const candidate = input as Record<string, unknown>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  if (name.length === 0) {
    return { data: null, error: "Client name is required." };
  }

  const contactInfo =
    typeof candidate.contactInfo === "string" ? candidate.contactInfo.trim() : "";

  return { data: { name, contactInfo }, error: null };
}

export function parseClientUpdatePayload(input: unknown): {
  data: ClientUpdatePayload | null;
  error: string | null;
} {
  if (!input || typeof input !== "object") {
    return { data: null, error: "Client update payload is invalid." };
  }

  const candidate = input as Record<string, unknown>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  if (name.length === 0) {
    return { data: null, error: "Client name is required." };
  }

  const contactInfo =
    typeof candidate.contactInfo === "string" ? candidate.contactInfo.trim() : "";

  return { data: { name, contactInfo }, error: null };
}
