import type { ClientOption } from "@/components/dashboard/session-form/models";
export type { ClientOption };

export function normalizeClientName(value: string): string {
  return value.trim();
}

export function getFilteredClients(
  clients: ClientOption[],
  query: string,
): ClientOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 1) {
    return [];
  }

  return clients.filter((client) =>
    client.name.toLowerCase().includes(normalizedQuery),
  );
}

export function isDuplicateClientName(
  clients: ClientOption[],
  name: string,
): boolean {
  const normalizedName = normalizeClientName(name).toLowerCase();
  if (!normalizedName) {
    return false;
  }

  return clients.some(
    (client) => normalizeClientName(client.name).toLowerCase() === normalizedName,
  );
}
