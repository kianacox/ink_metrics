import React from "react";
import { render } from "@testing-library/react";
import { DashboardTabsSkeleton } from "../dashboard-tabs-skeleton";

describe("DashboardTabsSkeleton", () => {
  it("renders a tablist row of skeletons matching the dashboard tab layout", () => {
    const { container } = render(<DashboardTabsSkeleton />);

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    // Expect at least a couple of tab placeholders and a content placeholder.
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it("uses an animated pulse to signal loading state", () => {
    const { container } = render(<DashboardTabsSkeleton />);

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    skeletons.forEach((node) => {
      expect(node.className).toContain("animate-pulse");
    });
  });
});
