import { render, screen, within } from "@testing-library/react";
import PricingPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFoundingCount } from "@/lib/marketing/get-founding-count";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  }),
}));

jest.mock("@/lib/marketing/get-founding-count", () => ({
  getFoundingCount: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);
const mockedRedirect = jest.mocked(redirect);
const mockedGetFoundingCount = jest.mocked(getFoundingCount);

function mockUnauthenticatedSupabase() {
  mockedCreateClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
  } as never);
}

function mockAuthenticatedSupabase() {
  mockedCreateClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "user-1", email: "user@example.com" } },
      }),
    },
  } as never);
}

describe("PricingPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the founding £9.99 headline price and embedded counter when spots are available", async () => {
    mockUnauthenticatedSupabase();
    mockedGetFoundingCount.mockResolvedValue({ count: 12, isFull: false });

    const ui = await PricingPage();
    render(ui);

    expect(screen.getByText("£9.99")).toBeInTheDocument();
    expect(screen.queryByText("£14.99")).not.toBeInTheDocument();

    // 60-day trial copy
    expect(
      screen.getByText(/60 days free/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/after your 60-day free trial/i),
    ).toBeInTheDocument();

    // Founding counter shows the count and is embedded inside the card
    expect(
      screen.getByText("12 of 50 founding spots taken"),
    ).toBeInTheDocument();

    // Founding price-for-life note is present
    expect(
      screen.getByText(/locked.*for life/i),
    ).toBeInTheDocument();
  });

  it("renders the standard £14.99 headline price and full-state counter above the card when full", async () => {
    mockUnauthenticatedSupabase();
    mockedGetFoundingCount.mockResolvedValue({ count: 50, isFull: true });

    const ui = await PricingPage();
    const { container } = render(ui);

    expect(screen.getByText("£14.99")).toBeInTheDocument();
    expect(screen.queryByText("£9.99")).not.toBeInTheDocument();

    // Full-state counter copy
    expect(
      screen.getByText("Founding spots full — 50 founding members joined"),
    ).toBeInTheDocument();

    // 60-day trial copy still present
    expect(screen.getByText(/60 days free/i)).toBeInTheDocument();
    expect(
      screen.getByText(/after your 60-day free trial/i),
    ).toBeInTheDocument();

    // Founding-price-for-life note must NOT appear when full
    expect(screen.queryByText(/locked.*for life/i)).not.toBeInTheDocument();

    // The counter should be rendered above the pricing card, not inside it
    const card = container.querySelector('[data-testid="pricing-card"]');
    expect(card).not.toBeNull();
    expect(
      within(card as HTMLElement).queryByText(/Founding spots full/),
    ).toBeNull();
  });

  it("calls getFoundingCount once per render", async () => {
    mockUnauthenticatedSupabase();
    mockedGetFoundingCount.mockResolvedValue({ count: 5, isFull: false });

    const ui = await PricingPage();
    render(ui);

    expect(mockedGetFoundingCount).toHaveBeenCalledTimes(1);
  });

  it("applies rounded-none to the pricing card and never rounded-xl", async () => {
    mockUnauthenticatedSupabase();
    mockedGetFoundingCount.mockResolvedValue({ count: 1, isFull: false });

    const ui = await PricingPage();
    const { container } = render(ui);

    const card = container.querySelector('[data-testid="pricing-card"]');
    expect(card).not.toBeNull();
    expect(card?.className).toContain("rounded-none");
    expect(card?.className).not.toContain("rounded-xl");
  });

  it("redirects authenticated users to /dashboard before rendering", async () => {
    mockAuthenticatedSupabase();
    mockedGetFoundingCount.mockResolvedValue({ count: 0, isFull: false });

    await expect(PricingPage()).rejects.toThrow(/__REDIRECT__:\/dashboard/);
    expect(mockedRedirect).toHaveBeenCalledWith("/dashboard");
  });
});
