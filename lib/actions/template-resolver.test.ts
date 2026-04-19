import { resolveMessageTemplate } from "@/lib/actions/template-resolver";

describe("resolveMessageTemplate", () => {
  it("substitutes client name in lapsed_repeat template", () => {
    const result = resolveMessageTemplate("lapsed_repeat", "Alice");
    expect(result).toContain("Hey Alice!");
    expect(result).not.toContain("{{client_name}}");
  });

  it("substitutes client name in new_client template", () => {
    const result = resolveMessageTemplate("new_client", "Bob");
    expect(result).toContain("Hey Bob!");
    expect(result).not.toContain("{{client_name}}");
  });

  it("substitutes client name in in_progress template", () => {
    const result = resolveMessageTemplate("in_progress", "Charlie");
    expect(result).toContain("Hey Charlie!");
    expect(result).not.toContain("{{client_name}}");
  });

  it("handles names with special characters", () => {
    const result = resolveMessageTemplate("lapsed_repeat", "O'Brien");
    expect(result).toContain("Hey O'Brien!");
  });

  it("returns correct template content per action type", () => {
    expect(resolveMessageTemplate("lapsed_repeat", "X")).toContain("availability coming up");
    expect(resolveMessageTemplate("new_client", "X")).toContain("enjoyed tattooing you");
    expect(resolveMessageTemplate("in_progress", "X")).toContain("checking in on your piece");
  });
});
