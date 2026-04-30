import React from "react";
import { render, screen } from "@testing-library/react";
import { ClientsTable } from "../clients-table";
import type { ClientListItem } from "@/lib/clients/models";

function makeClient(overrides: Partial<ClientListItem> = {}): ClientListItem {
  return {
    id: "client-id",
    name: "Test Client",
    contactInfo: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastSessionAt: null,
    lifetimeSessionCount: 0,
    lifetimeTotalValueMinor: 0,
    rangeSessionCount: 0,
    rangeTotalValueMinor: 0,
    ...overrides,
  };
}

function renderTable(clients: ClientListItem[]) {
  return render(
    <ClientsTable
      clients={clients}
      currencyCode="GBP"
      dateRangeLabel="this month"
      onEditClient={jest.fn()}
      onDeleteClient={jest.fn()}
    />,
  );
}

describe("ClientsTable tier badge", () => {
  it("renders 'One-timer' badge for clients with 0 lifetime sessions", () => {
    renderTable([
      makeClient({ id: "c1", name: "Zero Sessions", lifetimeSessionCount: 0 }),
    ]);
    expect(screen.getByText("One-timer")).toBeInTheDocument();
  });

  it("renders 'One-timer' badge for clients with 1 lifetime session", () => {
    renderTable([
      makeClient({ id: "c1", name: "Single Session", lifetimeSessionCount: 1 }),
    ]);
    expect(screen.getByText("One-timer")).toBeInTheDocument();
  });

  it("renders 'Regular' badge for clients with 2-4 lifetime sessions", () => {
    renderTable([
      makeClient({ id: "c1", name: "Regular Two", lifetimeSessionCount: 2 }),
      makeClient({ id: "c2", name: "Regular Four", lifetimeSessionCount: 4 }),
    ]);
    expect(screen.getAllByText("Regular")).toHaveLength(2);
  });

  it("renders 'VIP' badge for clients with 5+ lifetime sessions", () => {
    renderTable([
      makeClient({ id: "c1", name: "VIP Client", lifetimeSessionCount: 5 }),
      makeClient({ id: "c2", name: "Big VIP", lifetimeSessionCount: 25 }),
    ]);
    expect(screen.getAllByText("VIP")).toHaveLength(2);
  });

  it("does not render the legacy 'Returning client' label", () => {
    renderTable([
      makeClient({ id: "c1", name: "Returning Charlie", lifetimeSessionCount: 4 }),
    ]);
    expect(screen.queryByText(/returning client/i)).not.toBeInTheDocument();
  });

  it("renders a tier badge for every client row", () => {
    renderTable([
      makeClient({ id: "c1", name: "A", lifetimeSessionCount: 0 }),
      makeClient({ id: "c2", name: "B", lifetimeSessionCount: 3 }),
      makeClient({ id: "c3", name: "C", lifetimeSessionCount: 8 }),
    ]);
    const tierLabels = ["One-timer", "Regular", "VIP"];
    tierLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
