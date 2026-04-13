import { parseExpenseCreatePayload, parseExpenseUpdatePayload } from "./expense-write";

const TODAY = new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

const VALID_CREATE = {
  item: "Black ink refill",
  category: "ink",
  amountMinor: 1234,
  currencyCode: "GBP",
  datePurchased: YESTERDAY,
};

describe("parseExpenseCreatePayload", () => {
  it("accepts a valid payload", () => {
    const result = parseExpenseCreatePayload(VALID_CREATE);
    expect(result.error).toBeNull();
    expect(result.data).toEqual(VALID_CREATE);
  });

  it("accepts amountMinor of zero", () => {
    const result = parseExpenseCreatePayload({ ...VALID_CREATE, amountMinor: 0 });
    expect(result.error).toBeNull();
    expect(result.data?.amountMinor).toBe(0);
  });

  it("trims whitespace from item and currencyCode", () => {
    const result = parseExpenseCreatePayload({
      ...VALID_CREATE,
      item: "  needles  ",
      currencyCode: "  USD  ",
    });
    expect(result.error).toBeNull();
    expect(result.data?.item).toBe("needles");
    expect(result.data?.currencyCode).toBe("USD");
  });

  it("rejects a non-object payload", () => {
    const result = parseExpenseCreatePayload("not an object");
    expect(result.error).toBe("Expense payload is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects null", () => {
    const result = parseExpenseCreatePayload(null);
    expect(result.error).toBe("Expense payload is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects an empty item", () => {
    const result = parseExpenseCreatePayload({ ...VALID_CREATE, item: "" });
    expect(result.error).toBe("Item name is required.");
    expect(result.data).toBeNull();
  });

  it("rejects a whitespace-only item", () => {
    const result = parseExpenseCreatePayload({ ...VALID_CREATE, item: "   " });
    expect(result.error).toBe("Item name is required.");
    expect(result.data).toBeNull();
  });

  it("rejects an invalid category", () => {
    const result = parseExpenseCreatePayload({ ...VALID_CREATE, category: "food" });
    expect(result.error).toBe("Category is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects a missing category", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { category, ...rest } = VALID_CREATE;
    const result = parseExpenseCreatePayload(rest);
    expect(result.error).toBe("Category is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects a negative amountMinor", () => {
    const result = parseExpenseCreatePayload({ ...VALID_CREATE, amountMinor: -1 });
    expect(result.error).toBe("Amount must be a non-negative integer.");
    expect(result.data).toBeNull();
  });

  it("rejects a non-integer amountMinor", () => {
    const result = parseExpenseCreatePayload({ ...VALID_CREATE, amountMinor: 12.5 });
    expect(result.error).toBe("Amount must be a non-negative integer.");
    expect(result.data).toBeNull();
  });

  it("rejects a non-number amountMinor", () => {
    const result = parseExpenseCreatePayload({ ...VALID_CREATE, amountMinor: "100" });
    expect(result.error).toBe("Amount must be a non-negative integer.");
    expect(result.data).toBeNull();
  });

  it("rejects a malformed datePurchased", () => {
    const result = parseExpenseCreatePayload({ ...VALID_CREATE, datePurchased: "not-a-date" });
    expect(result.error).toBe("Date purchased must be a valid date (YYYY-MM-DD).");
    expect(result.data).toBeNull();
  });

  it("rejects an invalid calendar date", () => {
    const result = parseExpenseCreatePayload({ ...VALID_CREATE, datePurchased: "2026-13-01" });
    expect(result.error).toBe("Date purchased must be a valid date (YYYY-MM-DD).");
    expect(result.data).toBeNull();
  });

  it("rejects a future datePurchased", () => {
    const result = parseExpenseCreatePayload({ ...VALID_CREATE, datePurchased: TOMORROW });
    expect(result.error).toBe("Expense date cannot be in the future.");
    expect(result.data).toBeNull();
  });

  it("accepts today as datePurchased", () => {
    const result = parseExpenseCreatePayload({ ...VALID_CREATE, datePurchased: TODAY });
    expect(result.error).toBeNull();
    expect(result.data?.datePurchased).toBe(TODAY);
  });

  it("rejects an empty currencyCode", () => {
    const result = parseExpenseCreatePayload({ ...VALID_CREATE, currencyCode: "" });
    expect(result.error).toBe("Currency code is required.");
    expect(result.data).toBeNull();
  });

  it("accepts all valid categories", () => {
    const categories = [
      "ink",
      "cartridges",
      "needles",
      "machines",
      "other_equipment",
      "travel",
      "miscellaneous",
    ];
    for (const category of categories) {
      const result = parseExpenseCreatePayload({ ...VALID_CREATE, category });
      expect(result.error).toBeNull();
      expect(result.data?.category).toBe(category);
    }
  });
});

describe("parseExpenseUpdatePayload", () => {
  it("accepts a payload updating only item", () => {
    const result = parseExpenseUpdatePayload({ item: "New item" });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ item: "New item" });
  });

  it("accepts a payload updating only category", () => {
    const result = parseExpenseUpdatePayload({ category: "travel" });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ category: "travel" });
  });

  it("accepts a payload updating only amountMinor", () => {
    const result = parseExpenseUpdatePayload({ amountMinor: 500 });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ amountMinor: 500 });
  });

  it("accepts all three receipt fields together", () => {
    const result = parseExpenseUpdatePayload({
      receiptPath: "user-id/expense-id/123-receipt.jpg",
      receiptMimeType: "image/jpeg",
      receiptSizeBytes: 204800,
    });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      receiptPath: "user-id/expense-id/123-receipt.jpg",
      receiptMimeType: "image/jpeg",
      receiptSizeBytes: 204800,
    });
  });

  it("rejects an empty payload (no fields)", () => {
    const result = parseExpenseUpdatePayload({});
    expect(result.error).toBe("No updatable fields were provided.");
    expect(result.data).toBeNull();
  });

  it("rejects a non-object payload", () => {
    const result = parseExpenseUpdatePayload(42);
    expect(result.error).toBe("Expense update payload is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects only receiptPath without the other receipt fields", () => {
    const result = parseExpenseUpdatePayload({ receiptPath: "some/path" });
    expect(result.error).toMatch(/receiptPath, receiptMimeType, receiptSizeBytes/);
    expect(result.data).toBeNull();
  });

  it("rejects receiptPath + receiptMimeType without receiptSizeBytes", () => {
    const result = parseExpenseUpdatePayload({
      receiptPath: "some/path",
      receiptMimeType: "image/jpeg",
    });
    expect(result.error).toMatch(/receiptPath, receiptMimeType, receiptSizeBytes/);
    expect(result.data).toBeNull();
  });

  it("rejects an invalid category on update", () => {
    const result = parseExpenseUpdatePayload({ category: "invalid" });
    expect(result.error).toBe("Category is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects a future datePurchased on update", () => {
    const result = parseExpenseUpdatePayload({ datePurchased: TOMORROW });
    expect(result.error).toBe("Expense date cannot be in the future.");
    expect(result.data).toBeNull();
  });

  it("rejects an empty item on update", () => {
    const result = parseExpenseUpdatePayload({ item: "" });
    expect(result.error).toBe("Item name is required.");
    expect(result.data).toBeNull();
  });

  it("accepts a combined core + receipt update", () => {
    const result = parseExpenseUpdatePayload({
      item: "Updated item",
      amountMinor: 999,
      receiptPath: "uid/eid/ts-file.jpg",
      receiptMimeType: "image/jpeg",
      receiptSizeBytes: 1024,
    });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      item: "Updated item",
      amountMinor: 999,
      receiptPath: "uid/eid/ts-file.jpg",
      receiptMimeType: "image/jpeg",
      receiptSizeBytes: 1024,
    });
  });
});
