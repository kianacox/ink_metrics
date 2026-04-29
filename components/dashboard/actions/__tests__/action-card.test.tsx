import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ActionCard, type Action } from "../action-card";

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
    AnimatePresence: ({ children }: { children: React.ReactNode }) => R.createElement(R.Fragment, null, children),
    useReducedMotion: jest.fn().mockReturnValue(false),
  };
});

// Mock clipboard API
const mockWriteText = jest.fn();
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
});

const baseAction: Action = {
  actionId: "action-1",
  clientId: "client-1",
  clientName: "Test Client",
  actionType: "lapsed_repeat",
  weeksSince: 10,
  revenueAtRiskMinor: 15000,
  messageTemplate: "Hey Test Client! It's been a while.",
};

function renderCard(
  overrides: Partial<Action> = {},
  onDismiss = jest.fn(),
  onDismissError = jest.fn(),
) {
  render(
    <ActionCard
      action={{ ...baseAction, ...overrides }}
      currencyCode="GBP"
      onDismiss={onDismiss}
      onDismissError={onDismissError}
    />,
  );
}

describe("ActionCard", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockWriteText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("renders client name", () => {
    renderCard();
    expect(screen.getByText("Test Client")).toBeInTheDocument();
  });

  it("renders lapsed_repeat nudge copy", () => {
    renderCard({ actionType: "lapsed_repeat", weeksSince: 10 });
    expect(
      screen.getByText(/10 weeks since their last session/i),
    ).toBeInTheDocument();
  });

  it("renders new_client nudge copy", () => {
    renderCard({ actionType: "new_client", weeksSince: 7 });
    expect(
      screen.getByText(/7 weeks since their first visit/i),
    ).toBeInTheDocument();
  });

  it("renders in_progress nudge copy", () => {
    renderCard({ actionType: "in_progress", weeksSince: 5 });
    expect(
      screen.getByText(/still in progress and it's been 5 weeks/i),
    ).toBeInTheDocument();
  });

  it("shows View message button initially", () => {
    renderCard();
    expect(screen.getByRole("button", { name: /view message/i })).toBeInTheDocument();
  });

  it("toggles to Hide message after clicking View message", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /view message/i }));
    expect(screen.getByRole("button", { name: /hide message/i })).toBeInTheDocument();
  });

  it("shows template text after opening", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /view message/i }));
    expect(screen.getByText(/hey test client/i)).toBeInTheDocument();
  });

  it("shows Copy message button after opening template", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /view message/i }));
    expect(screen.getByRole("button", { name: /copy message/i })).toBeInTheDocument();
  });

  it("clicking Copy message writes to clipboard", async () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /view message/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy message/i }));
    });
    expect(mockWriteText).toHaveBeenCalledWith("Hey Test Client! It's been a while.");
  });

  it("shows Copied! after copying", async () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /view message/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy message/i }));
    });
    expect(screen.getByRole("button", { name: /copied!/i })).toBeInTheDocument();
  });

  it("reverts Copied! to Copy message after 2 seconds", async () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /view message/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy message/i }));
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: /copy message/i })).toBeInTheDocument();
  });

  it("Dismiss button calls fetch and then onDismiss on success", async () => {
    const onDismiss = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    renderCard({}, onDismiss);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    });
    expect(onDismiss).toHaveBeenCalledWith("action-1");
  });

  it("Dismiss calls onDismissError and re-enables button on fetch failure", async () => {
    const onDismissError = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    renderCard({}, jest.fn(), onDismissError);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    });
    expect(onDismissError).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /dismiss/i })).not.toBeDisabled();
  });

  describe("type label and priority badge", () => {
    it("shows Retention label for lapsed_repeat", () => {
      renderCard({ actionType: "lapsed_repeat" });
      expect(screen.getByText("Retention")).toBeInTheDocument();
    });

    it("shows Follow-up label for new_client", () => {
      renderCard({ actionType: "new_client" });
      expect(screen.getByText("Follow-up")).toBeInTheDocument();
    });

    it("shows In Progress label for in_progress", () => {
      renderCard({ actionType: "in_progress" });
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("shows HIGH priority badge for lapsed_repeat", () => {
      renderCard({ actionType: "lapsed_repeat" });
      expect(screen.getByText("HIGH")).toBeInTheDocument();
    });

    it("shows MEDIUM priority badge for new_client", () => {
      renderCard({ actionType: "new_client" });
      expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    });

    it("shows MEDIUM priority badge for in_progress", () => {
      renderCard({ actionType: "in_progress" });
      expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    });
  });
});
