import React from "react";
import { render, screen } from "@testing-library/react";
import { useReducedMotion } from "framer-motion";
import { AnimatedCard } from "../animated-card";

jest.mock("framer-motion", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require("react");
  const div = R.forwardRef(
    (
      { children, initial, ...rest }: {
        children?: React.ReactNode;
        initial?: boolean | string;
        [key: string]: unknown;
      },
      ref: React.Ref<HTMLDivElement>,
    ) => R.createElement("div", { ...rest, "data-initial": String(initial), ref }, children),
  );
  div.displayName = "MockMotionDiv";
  return { motion: { div }, useReducedMotion: jest.fn() };
});

const mockUseReducedMotion = useReducedMotion as jest.Mock;

describe("AnimatedCard", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  it("renders children", () => {
    render(<AnimatedCard>content</AnimatedCard>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("applies base card classes", () => {
    render(<AnimatedCard data-testid="card">content</AnimatedCard>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("rounded-none");
    expect(card.className).toContain("border");
    expect(card.className).toContain("bg-card");
  });

  it("merges additional className", () => {
    render(<AnimatedCard className="extra-class" data-testid="card">content</AnimatedCard>);
    expect(screen.getByTestId("card").className).toContain("extra-class");
  });

  it("sets initial to hidden when reduced motion is off", () => {
    mockUseReducedMotion.mockReturnValue(false);
    render(<AnimatedCard data-testid="card">content</AnimatedCard>);
    expect(screen.getByTestId("card")).toHaveAttribute("data-initial", "hidden");
  });

  it("sets initial to false when reduced motion is on", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<AnimatedCard data-testid="card">content</AnimatedCard>);
    expect(screen.getByTestId("card")).toHaveAttribute("data-initial", "false");
  });

  it("forwards ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<AnimatedCard ref={ref}>content</AnimatedCard>);
    expect(ref.current).not.toBeNull();
  });
});
