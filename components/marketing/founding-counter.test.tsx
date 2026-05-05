import React from "react";
import { render, screen } from "@testing-library/react";
import { FoundingCounter } from "./founding-counter";

describe("FoundingCounter", () => {
  it("renders progress bar with value=0 and max=50 when count is 0", () => {
    render(<FoundingCounter count={0} isFull={false} />);
    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("value", "0");
    expect(progress).toHaveAttribute("max", "50");
    expect(
      screen.getByText("0 of 50 founding spots taken"),
    ).toBeInTheDocument();
  });

  it("renders progress bar with mid-range count and the corresponding label", () => {
    render(<FoundingCounter count={25} isFull={false} />);
    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("value", "25");
    expect(progress).toHaveAttribute("max", "50");
    expect(
      screen.getByText("25 of 50 founding spots taken"),
    ).toBeInTheDocument();
  });

  it("renders the not-full label when count is 49 and isFull is false", () => {
    render(<FoundingCounter count={49} isFull={false} />);
    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("value", "49");
    expect(progress).toHaveAttribute("max", "50");
    expect(
      screen.getByText("49 of 50 founding spots taken"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Founding spots full/),
    ).not.toBeInTheDocument();
  });

  it("renders the full label when isFull is true", () => {
    render(<FoundingCounter count={50} isFull={true} />);
    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("value", "50");
    expect(progress).toHaveAttribute("max", "50");
    expect(
      screen.getByText("Founding spots full — 50 founding members joined"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/of 50 founding spots taken/),
    ).not.toBeInTheDocument();
  });
});
