import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorState } from "../error-state";

describe("ErrorState", () => {
  it("renders the dynamic message text", () => {
    render(<ErrorState message="Couldn't load things." />);
    expect(screen.getByText("Couldn't load things.")).toBeInTheDocument();
  });

  it("renders the standard 'Something went wrong' headline", () => {
    render(<ErrorState message="Error" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders a 'Try again' button when onRetry is provided", () => {
    render(<ErrorState message="Error" onRetry={() => undefined} />);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("calls onRetry when the 'Try again' button is clicked", () => {
    const onRetry = jest.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render a 'Try again' button when onRetry is undefined", () => {
    render(<ErrorState message="Error" />);
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });
});
