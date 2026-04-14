import { render, screen } from "@testing-library/react";
import { LoadingState } from "../loading-state";

describe("LoadingState", () => {
  it("renders the spinner with aria-hidden", () => {
    render(<LoadingState />);
    const spinner = document.querySelector("[aria-hidden='true']");
    expect(spinner).toBeInTheDocument();
  });

  it("renders the default message", () => {
    render(<LoadingState />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders a custom message", () => {
    render(<LoadingState message="Loading sessions…" />);
    expect(screen.getByText("Loading sessions…")).toBeInTheDocument();
  });
});
