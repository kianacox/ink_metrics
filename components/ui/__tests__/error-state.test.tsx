import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorState } from "../error-state";

describe("ErrorState", () => {
  it("renders the message text", () => {
    render(<ErrorState message="Something went wrong." />);
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });

  it("renders a Retry button when onRetry is provided", () => {
    render(<ErrorState message="Error" onRetry={() => undefined} />);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("calls onRetry when the Retry button is clicked", () => {
    const onRetry = jest.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render a Retry button when onRetry is undefined", () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});
