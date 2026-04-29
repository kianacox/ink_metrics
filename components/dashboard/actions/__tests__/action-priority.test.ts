import {
  getActionPriority,
  getActionTypeLabel,
  isHighPriority,
} from "../action-priority";

describe("getActionPriority", () => {
  it("returns HIGH for lapsed_repeat", () => {
    expect(getActionPriority("lapsed_repeat")).toBe("HIGH");
  });

  it("returns MEDIUM for new_client", () => {
    expect(getActionPriority("new_client")).toBe("MEDIUM");
  });

  it("returns MEDIUM for in_progress", () => {
    expect(getActionPriority("in_progress")).toBe("MEDIUM");
  });
});

describe("getActionTypeLabel", () => {
  it("returns Retention for lapsed_repeat", () => {
    expect(getActionTypeLabel("lapsed_repeat")).toBe("Retention");
  });

  it("returns Follow-up for new_client", () => {
    expect(getActionTypeLabel("new_client")).toBe("Follow-up");
  });

  it("returns In Progress for in_progress", () => {
    expect(getActionTypeLabel("in_progress")).toBe("In Progress");
  });
});

describe("isHighPriority", () => {
  it("returns true for lapsed_repeat", () => {
    expect(isHighPriority("lapsed_repeat")).toBe(true);
  });

  it("returns false for new_client", () => {
    expect(isHighPriority("new_client")).toBe(false);
  });

  it("returns false for in_progress", () => {
    expect(isHighPriority("in_progress")).toBe(false);
  });
});
