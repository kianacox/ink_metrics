import { fireEvent, render, screen } from "@testing-library/react";
import { MonthNavigator } from "./month-navigator";

describe("MonthNavigator", () => {
  const baseProps = {
    monthLabel: "March",
    year: 2026,
    onPrev: jest.fn(),
    onNext: jest.fn(),
    canGoPrev: true,
    canGoNext: true,
  };

  beforeEach(() => {
    baseProps.onPrev.mockReset();
    baseProps.onNext.mockReset();
  });

  it("renders the month label and year", () => {
    render(<MonthNavigator {...baseProps} />);
    expect(screen.getByText(/March\s*2026/)).toBeInTheDocument();
  });

  it("renders previous and next buttons", () => {
    render(<MonthNavigator {...baseProps} />);
    expect(
      screen.getByRole("button", { name: /previous month/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next month/i }),
    ).toBeInTheDocument();
  });

  it("calls onPrev when the previous button is clicked", () => {
    render(<MonthNavigator {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /previous month/i }));
    expect(baseProps.onPrev).toHaveBeenCalledTimes(1);
  });

  it("calls onNext when the next button is clicked", () => {
    render(<MonthNavigator {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(baseProps.onNext).toHaveBeenCalledTimes(1);
  });

  it("disables the previous button when canGoPrev is false", () => {
    render(<MonthNavigator {...baseProps} canGoPrev={false} />);
    expect(
      screen.getByRole("button", { name: /previous month/i }),
    ).toBeDisabled();
  });

  it("disables the next button when canGoNext is false", () => {
    render(<MonthNavigator {...baseProps} canGoNext={false} />);
    expect(
      screen.getByRole("button", { name: /next month/i }),
    ).toBeDisabled();
  });

  it("does not call onPrev when previous is disabled and clicked", () => {
    render(<MonthNavigator {...baseProps} canGoPrev={false} />);
    fireEvent.click(screen.getByRole("button", { name: /previous month/i }));
    expect(baseProps.onPrev).not.toHaveBeenCalled();
  });

  it("does not call onNext when next is disabled and clicked", () => {
    render(<MonthNavigator {...baseProps} canGoNext={false} />);
    fireEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(baseProps.onNext).not.toHaveBeenCalled();
  });
});
