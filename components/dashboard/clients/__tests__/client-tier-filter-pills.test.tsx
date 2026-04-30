import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ClientTierFilterPills } from "../client-tier-filter-pills";

describe("ClientTierFilterPills", () => {
  it("renders four pills: All, VIP, Regular, One-timer", () => {
    render(<ClientTierFilterPills activeTier={null} onChange={jest.fn()} />);

    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "VIP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regular" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "One-timer" })).toBeInTheDocument();
  });

  it("marks the All pill as the active variant when activeTier is null", () => {
    render(<ClientTierFilterPills activeTier={null} onChange={jest.fn()} />);

    const allButton = screen.getByRole("button", { name: "All" });
    expect(allButton).toHaveAttribute("data-active", "true");

    const vipButton = screen.getByRole("button", { name: "VIP" });
    expect(vipButton).toHaveAttribute("data-active", "false");
  });

  it("marks only the matching pill as active when a tier is selected", () => {
    render(<ClientTierFilterPills activeTier="vip" onChange={jest.fn()} />);

    expect(screen.getByRole("button", { name: "VIP" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "data-active",
      "false",
    );
    expect(screen.getByRole("button", { name: "Regular" })).toHaveAttribute(
      "data-active",
      "false",
    );
    expect(screen.getByRole("button", { name: "One-timer" })).toHaveAttribute(
      "data-active",
      "false",
    );
  });

  it("calls onChange with the selected tier value when a pill is clicked", () => {
    const onChange = jest.fn();

    render(<ClientTierFilterPills activeTier={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "VIP" }));
    expect(onChange).toHaveBeenLastCalledWith("vip");

    fireEvent.click(screen.getByRole("button", { name: "Regular" }));
    expect(onChange).toHaveBeenLastCalledWith("regular");

    fireEvent.click(screen.getByRole("button", { name: "One-timer" }));
    expect(onChange).toHaveBeenLastCalledWith("one-timer");
  });

  it("calls onChange with null when the All pill is clicked", () => {
    const onChange = jest.fn();

    render(<ClientTierFilterPills activeTier="vip" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
