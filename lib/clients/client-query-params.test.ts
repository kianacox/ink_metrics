import {
  CLIENT_VALID_DATE_RANGES,
  CLIENT_VALID_SORT_FIELDS,
  CLIENT_VALID_TIERS,
  isValidClientDateRange,
  isValidClientSortField,
  isValidClientTier,
  parseClientCreateRpcError,
  parseClientDateRange,
  parseClientSortField,
  parseClientTier,
} from "./client-query-params";

describe("client query param helpers", () => {
  describe("CLIENT_VALID_SORT_FIELDS", () => {
    it("contains the expected sort fields", () => {
      expect([...CLIENT_VALID_SORT_FIELDS]).toEqual(["session_count", "total_value"]);
    });
  });

  describe("CLIENT_VALID_DATE_RANGES", () => {
    it("contains the expected presets", () => {
      expect([...CLIENT_VALID_DATE_RANGES].sort()).toEqual(
        ["allTime", "last30Days", "last90Days", "thisMonth", "yearToDate"].sort(),
      );
    });
  });

  describe("CLIENT_VALID_TIERS", () => {
    it("contains the expected tier values", () => {
      expect([...CLIENT_VALID_TIERS].sort()).toEqual(["one-timer", "regular", "vip"].sort());
    });
  });

  describe("isValidClientSortField", () => {
    it("returns true for known fields", () => {
      expect(isValidClientSortField("session_count")).toBe(true);
      expect(isValidClientSortField("total_value")).toBe(true);
    });

    it("returns false for unknown fields", () => {
      expect(isValidClientSortField("unknown")).toBe(false);
      expect(isValidClientSortField(null)).toBe(false);
    });
  });

  describe("parseClientSortField", () => {
    it("returns the value for valid sort fields", () => {
      expect(parseClientSortField("session_count")).toBe("session_count");
      expect(parseClientSortField("total_value")).toBe("total_value");
    });

    it("falls back to session_count for invalid fields", () => {
      expect(parseClientSortField("unknown")).toBe("session_count");
      expect(parseClientSortField(null)).toBe("session_count");
    });
  });

  describe("isValidClientDateRange", () => {
    it("returns true for known presets", () => {
      expect(isValidClientDateRange("last90Days")).toBe(true);
      expect(isValidClientDateRange("thisMonth")).toBe(true);
    });

    it("returns false for unknown presets", () => {
      expect(isValidClientDateRange("never")).toBe(false);
      expect(isValidClientDateRange(null)).toBe(false);
    });
  });

  describe("parseClientDateRange", () => {
    it("returns the value for valid presets", () => {
      expect(parseClientDateRange("last30Days")).toBe("last30Days");
      expect(parseClientDateRange("yearToDate")).toBe("yearToDate");
    });

    it("falls back to last90Days for unknown presets", () => {
      expect(parseClientDateRange("nope")).toBe("last90Days");
      expect(parseClientDateRange(null)).toBe("last90Days");
    });
  });

  describe("isValidClientTier", () => {
    it("returns true for known tiers", () => {
      expect(isValidClientTier("vip")).toBe(true);
      expect(isValidClientTier("regular")).toBe(true);
      expect(isValidClientTier("one-timer")).toBe(true);
    });

    it("returns false for unknown tiers", () => {
      expect(isValidClientTier("platinum")).toBe(false);
      expect(isValidClientTier(null)).toBe(false);
    });
  });

  describe("parseClientTier", () => {
    it("returns null when no tier is provided", () => {
      expect(parseClientTier(null)).toEqual({ data: null, error: null });
    });

    it("returns the tier when valid", () => {
      expect(parseClientTier("vip")).toEqual({ data: "vip", error: null });
      expect(parseClientTier("one-timer")).toEqual({ data: "one-timer", error: null });
    });

    it("returns an error message when invalid", () => {
      const result = parseClientTier("platinum");
      expect(result.data).toBeNull();
      expect(result.error).toBe("Invalid tier: platinum");
    });
  });

  describe("parseClientCreateRpcError", () => {
    it("returns 409 ALREADY EXISTS for duplicate name error", () => {
      const result = parseClientCreateRpcError("A client with this name already exists.");
      expect(result).toEqual({
        status: 409,
        code: "CLIENT_ALREADY_EXISTS",
        message: "A client with this name already exists.",
      });
    });

    it("returns 400 generic for any other error", () => {
      const result = parseClientCreateRpcError("Some other db failure");
      expect(result).toEqual({
        status: 400,
        code: "CLIENT_CREATE_FAILED",
        message: "Could not create client.",
      });
    });
  });
});
