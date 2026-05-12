import { render, screen, fireEvent } from "@testing-library/react";
import { TrackedLink } from "./tracked-link";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

describe("TrackedLink", () => {
  beforeEach(() => {
    Object.defineProperty(window, "gtag", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it("renders a link with the correct href", () => {
    render(
      <TrackedLink href="/auth/sign-up" eventName="hero_cta_click">
        Sign up
      </TrackedLink>
    );
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/auth/sign-up"
    );
  });

  it("fires gtag event with correct name on click", () => {
    const mockGtag = jest.fn();
    window.gtag = mockGtag;

    render(
      <TrackedLink href="/auth/sign-up" eventName="hero_cta_click">
        Sign up
      </TrackedLink>
    );

    fireEvent.click(screen.getByRole("link"));
    expect(mockGtag).toHaveBeenCalledWith("event", "hero_cta_click", undefined);
  });

  it("fires gtag event with params when provided", () => {
    const mockGtag = jest.fn();
    window.gtag = mockGtag;

    render(
      <TrackedLink
        href="/auth/sign-up"
        eventName="header_cta_click"
        eventParams={{ page: "pricing" }}
      >
        Get started
      </TrackedLink>
    );

    fireEvent.click(screen.getByRole("link"));
    expect(mockGtag).toHaveBeenCalledWith("event", "header_cta_click", {
      page: "pricing",
    });
  });

  it("does not throw when window.gtag is undefined", () => {
    window.gtag = undefined as unknown as typeof window.gtag;

    render(
      <TrackedLink href="/auth/sign-up" eventName="hero_cta_click">
        Sign up
      </TrackedLink>
    );

    expect(() => fireEvent.click(screen.getByRole("link"))).not.toThrow();
  });

  it("calls the onClick prop in addition to gtag", () => {
    const mockGtag = jest.fn();
    window.gtag = mockGtag;
    const onClickSpy = jest.fn();

    render(
      <TrackedLink
        href="/auth/sign-up"
        eventName="hero_cta_click"
        onClick={onClickSpy}
      >
        Sign up
      </TrackedLink>
    );

    fireEvent.click(screen.getByRole("link"));
    expect(mockGtag).toHaveBeenCalled();
    expect(onClickSpy).toHaveBeenCalled();
  });
});
