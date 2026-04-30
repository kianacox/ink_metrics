import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { DashboardAnalyticsResponse } from "@/lib/dashboard-analytics";
import { DashboardAnalyticsView } from "./dashboard-analytics-view";

const navigateMock = jest.fn();
let currentSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useSearchParams: () => currentSearchParams,
  useRouter: () => ({
    replace: (url: string) => {
      navigateMock(url);
      const queryString = url.split("?")[1] ?? "";
      currentSearchParams = new URLSearchParams(queryString);
    },
    push: (url: string) => {
      navigateMock(url);
      const queryString = url.split("?")[1] ?? "";
      currentSearchParams = new URLSearchParams(queryString);
    },
  }),
  usePathname: () => "/dashboard",
}));

jest.mock("@/lib/preferences/use-preferences", () => ({
  usePreferences: () => ({
    data: {
      defaultCurrency: "USD",
      reportingTimezone: "America/New_York",
    },
  }),
}));

const buildAnalytics = (
  monthLabel: string,
  hasPriorMonthData: boolean,
): DashboardAnalyticsResponse => ({
  monthLabel,
  timeWindow: {
    startUtcIso: "2026-04-01T04:00:00.000Z",
    endUtcIso: "2026-05-01T04:00:00.000Z",
    timezone: "America/New_York",
  },
  takeHome: {
    grossMinor: 500000,
    paidToStudioMinor: 150000,
    totalExpensesMinor: 50000,
    netMinor: 300000,
  },
  retention: {
    numerator: 4,
    denominator: 10,
    rate: 0.4,
    totalSessions: 20,
  },
  averageProfitPerSession: {
    valueMinor: 75000,
    sessionCount: 4,
  },
  expensesByCategory: {
    items: [{ category: "supplies", totalMinor: 50000 }],
    totalMinor: 50000,
  },
  hasPriorMonthData,
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: Infinity, retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("DashboardAnalyticsView URL sync", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    currentSearchParams = new URLSearchParams();
    jest.useFakeTimers();
    // Lock "now" to April 30 2026 local
    jest.setSystemTime(new Date(2026, 3, 30).getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses 'current' when no ?month query param is present and fetches the current month", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(buildAnalytics("April 2026", true)),
      });
    global.fetch = fetchMock as jest.Mock;

    renderWithProviders(<DashboardAnalyticsView />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboard/analytics?month=current",
    );
  });

  it("reads ?month from the URL on mount and fetches that month", async () => {
    currentSearchParams = new URLSearchParams("month=2026-02");
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildAnalytics("February 2026", true)),
    });
    global.fetch = fetchMock as jest.Mock;

    renderWithProviders(<DashboardAnalyticsView />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboard/analytics?month=2026-02",
    );
  });

  it("pushes ?month=YYYY-MM to the URL when the previous month is selected", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildAnalytics("April 2026", true)),
    });
    global.fetch = fetchMock as jest.Mock;

    renderWithProviders(<DashboardAnalyticsView />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const prevButton = await screen.findByRole("button", {
      name: /previous month/i,
    });
    fireEvent.click(prevButton);

    expect(navigateMock).toHaveBeenCalled();
    const navigatedUrl = navigateMock.mock.calls[navigateMock.mock.calls.length - 1][0];
    expect(navigatedUrl).toContain("month=2026-03");
  });

  it("removes the ?month param when navigating back to the current month", async () => {
    currentSearchParams = new URLSearchParams("month=2026-03");
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildAnalytics("March 2026", true)),
    });
    global.fetch = fetchMock as jest.Mock;

    renderWithProviders(<DashboardAnalyticsView />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const nextButton = await screen.findByRole("button", {
      name: /next month/i,
    });
    fireEvent.click(nextButton);

    expect(navigateMock).toHaveBeenCalled();
    const navigatedUrl = navigateMock.mock.calls[navigateMock.mock.calls.length - 1][0];
    expect(navigatedUrl).not.toContain("month=");
  });

  it("disables the previous button when hasPriorMonthData is false", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildAnalytics("April 2026", false)),
    });
    global.fetch = fetchMock as jest.Mock;

    renderWithProviders(<DashboardAnalyticsView />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const prevButton = await screen.findByRole("button", {
      name: /previous month/i,
    });
    expect(prevButton).toBeDisabled();
  });

  it("disables the next button when viewing the current month", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildAnalytics("April 2026", true)),
    });
    global.fetch = fetchMock as jest.Mock;

    renderWithProviders(<DashboardAnalyticsView />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const nextButton = await screen.findByRole("button", {
      name: /next month/i,
    });
    expect(nextButton).toBeDisabled();
  });

  it("enables the next button when viewing a past month", async () => {
    currentSearchParams = new URLSearchParams("month=2026-02");
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildAnalytics("February 2026", true)),
    });
    global.fetch = fetchMock as jest.Mock;

    renderWithProviders(<DashboardAnalyticsView />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const nextButton = await screen.findByRole("button", {
      name: /next month/i,
    });
    expect(nextButton).not.toBeDisabled();
  });
});
