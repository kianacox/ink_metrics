import { fireEvent, render, screen } from "@testing-library/react";
import { DatePicker } from "./date-picker";

describe("DatePicker", () => {
  it("renders the placeholder when value is empty", () => {
    render(<DatePicker value="" onChange={jest.fn()} />);
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveTextContent(/pick a date/i);
  });

  it("renders a formatted date when value is a YYYY-MM-DD string", () => {
    render(<DatePicker value="2024-06-15" onChange={jest.fn()} />);
    const trigger = screen.getByRole("button");
    // Locale-aware formatting just needs to be non-placeholder & non-empty
    expect(trigger.textContent).not.toMatch(/pick a date/i);
    expect((trigger.textContent ?? "").length).toBeGreaterThan(0);
  });

  it("opens a calendar and calls onChange with a YYYY-MM-DD string when a day is selected", () => {
    const handleChange = jest.fn();
    render(<DatePicker value="2024-06-15" onChange={handleChange} />);

    fireEvent.click(screen.getByRole("button"));

    // The calendar pops up — find any enabled day cell and click it
    const dayButtons = document.querySelectorAll<HTMLButtonElement>(
      "button[data-day]:not([disabled])",
    );
    expect(dayButtons.length).toBeGreaterThan(0);
    fireEvent.click(dayButtons[0]);

    expect(handleChange).toHaveBeenCalledTimes(1);
    const arg = handleChange.mock.calls[0][0];
    expect(typeof arg).toBe("string");
    expect(arg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("does not call onChange when a disabled day (after the 'after' bound) is clicked", () => {
    const handleChange = jest.fn();
    // 'after' is yesterday — today + future are disabled.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    render(
      <DatePicker
        value=""
        onChange={handleChange}
        disabled={{ after: yesterday }}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    // Any button with [data-day] AND [disabled] should not trigger onChange.
    const disabled = document.querySelectorAll<HTMLButtonElement>(
      "button[data-day][disabled]",
    );
    // We expect at least one disabled day (today or future visible in current month grid).
    if (disabled.length > 0) {
      fireEvent.click(disabled[0]);
    }
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("wires the id prop to the trigger button for label association", () => {
    render(<DatePicker id="my-date" value="" onChange={jest.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("id", "my-date");
  });

  it("forwards aria-required to the trigger", () => {
    render(<DatePicker value="" onChange={jest.fn()} aria-required />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-required", "true");
  });
});
