import { render } from "@testing-library/react";
import { GoogleAnalytics } from "./google-analytics";

jest.mock("next/script", () => ({
  __esModule: true,
  default: ({ src, onLoad }: { src: string; onLoad?: () => void }) => {
    if (onLoad) onLoad();
    return <div data-testid="ga-script" data-src={src} />;
  },
}));

describe("GoogleAnalytics", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    Object.defineProperty(window, "dataLayer", {
      value: [],
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "gtag", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, "cookie", {
      value: "",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("renders script element when measurement ID is set", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST123";
    const { container } = render(<GoogleAnalytics />);
    const el = container.querySelector("[data-testid='ga-script']");
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-src")).toContain("G-TEST123");
  });

  it("renders nothing when measurement ID is absent", () => {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const { container } = render(<GoogleAnalytics />);
    expect(container.firstChild).toBeNull();
  });

  it("registers cookieyes:consent listener on mount", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST123";
    const addSpy = jest.spyOn(document, "addEventListener");
    render(<GoogleAnalytics />);
    expect(addSpy).toHaveBeenCalledWith(
      "cookieyes:consent",
      expect.any(Function)
    );
    addSpy.mockRestore();
  });

  it("removes cookieyes:consent listener on unmount", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST123";
    const removeSpy = jest.spyOn(document, "removeEventListener");
    const { unmount } = render(<GoogleAnalytics />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      "cookieyes:consent",
      expect.any(Function)
    );
    removeSpy.mockRestore();
  });
});
