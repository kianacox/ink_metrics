import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

// Mock framer-motion — animated components render children without animation in tests
jest.mock("framer-motion", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require("react");
  const div = R.forwardRef(
    (
      { children, ...rest }: { children?: React.ReactNode; [key: string]: unknown },
      ref: React.Ref<HTMLDivElement>,
    ) => R.createElement("div", { ref, ...rest }, children),
  );
  div.displayName = "MockMotionDiv";
  return {
    motion: { div },
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      R.createElement(R.Fragment, null, children),
    useReducedMotion: jest.fn().mockReturnValue(false),
  };
});

// Mock the modals so we don't need to render their internals
jest.mock("../client-create-modal", () => ({
  ClientCreateModal: () => null,
}));
jest.mock("../client-edit-modal", () => ({
  ClientEditModal: () => null,
}));
jest.mock("../client-delete-modal", () => ({
  ClientDeleteModal: () => null,
}));

const mockUseClients = jest.fn();
jest.mock("@/components/dashboard/clients/hooks/use-clients", () => ({
  useClients: (params: unknown) => mockUseClients(params),
}));

import { ClientsView } from "../clients-view";

function makeUseClientsResult(
  overrides: Partial<{
    clients: unknown[];
    isLoading: boolean;
    isLoadingMore: boolean;
    hasNextPage: boolean;
    error: string | null;
  }> = {},
) {
  return {
    clients: [],
    defaultCurrency: "USD",
    reportingTimezone: "America/New_York",
    isLoading: false,
    isLoadingMore: false,
    hasNextPage: false,
    error: null,
    refetch: jest.fn(),
    loadMore: jest.fn(),
    ...overrides,
  };
}

describe("ClientsView tier filter integration", () => {
  beforeEach(() => {
    mockUseClients.mockReset();
    mockUseClients.mockReturnValue(makeUseClientsResult());
  });

  it("renders four tier filter pills below the controls", () => {
    render(<ClientsView />);

    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "VIP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regular" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "One-timer" })).toBeInTheDocument();
  });

  it("passes tier=null to useClients on initial render", () => {
    render(<ClientsView />);

    expect(mockUseClients).toHaveBeenCalledWith(
      expect.objectContaining({ tier: null }),
    );
  });

  it("passes the selected tier to useClients when a pill is clicked", () => {
    render(<ClientsView />);

    fireEvent.click(screen.getByRole("button", { name: "VIP" }));

    const lastCall = mockUseClients.mock.calls[mockUseClients.mock.calls.length - 1];
    expect(lastCall[0]).toMatchObject({ tier: "vip" });
  });

  it("keeps the card title as 'All clients' regardless of selected tier", () => {
    render(<ClientsView />);

    fireEvent.click(screen.getByRole("button", { name: "VIP" }));

    expect(
      screen.getByRole("heading", { name: "All clients" }),
    ).toBeInTheDocument();
  });

  it("shows tier-aware empty state for VIP", () => {
    render(<ClientsView />);

    fireEvent.click(screen.getByRole("button", { name: "VIP" }));

    expect(screen.getByText(/no vip clients yet\.?/i)).toBeInTheDocument();
  });

  it("shows tier-aware empty state for Regular", () => {
    render(<ClientsView />);

    fireEvent.click(screen.getByRole("button", { name: "Regular" }));

    expect(screen.getByText(/no regular clients yet\.?/i)).toBeInTheDocument();
  });

  it("shows tier-aware empty state for One-timer", () => {
    render(<ClientsView />);

    fireEvent.click(screen.getByRole("button", { name: "One-timer" }));

    expect(
      screen.getByText(/no one-time clients yet\.?/i),
    ).toBeInTheDocument();
  });

  it("shows the default empty state when tier is All (null)", () => {
    render(<ClientsView />);

    expect(screen.getByText(/no clients yet\.?/i)).toBeInTheDocument();
  });
});
