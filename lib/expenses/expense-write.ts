import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseCreatePayload,
  type ExpenseUpdatePayload,
} from "@/lib/expenses/models";

export type { ExpenseCreatePayload, ExpenseUpdatePayload };

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Allowed MIME types mirrored from the client-side upload helper so the
// backend can independently reject invalid file types.
export const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

// ---------------------------------------------------------------------------
// Field-level validators — each returns { ok: true, value } on success
// or { ok: false, error } on failure. The `ok` discriminant lets TypeScript
// narrow the union cleanly after a guard check.
// ---------------------------------------------------------------------------

type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

function ok<T>(value: T): FieldResult<T> {
  return { ok: true, value };
}

function fail<T = never>(error: string): FieldResult<T> {
  return { ok: false, error };
}

function validateItem(raw: unknown): FieldResult<string> {
  const item = typeof raw === "string" ? raw.trim() : "";
  return item.length === 0 ? fail("Item name is required.") : ok(item);
}

function validateCategory(raw: unknown): FieldResult<ExpenseCategory> {
  const valid = typeof raw === "string" && EXPENSE_CATEGORIES.includes(raw as ExpenseCategory);
  return valid ? ok(raw as ExpenseCategory) : fail("Category is invalid.");
}

function validateAmountMinor(raw: unknown): FieldResult<number> {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) {
    return fail("Amount must be a non-negative integer.");
  }
  return ok(raw);
}

function validateCurrencyCode(raw: unknown): FieldResult<string> {
  const code = typeof raw === "string" ? raw.trim() : "";
  return code.length === 0 ? fail("Currency code is required.") : ok(code);
}

function validateDatePurchased(raw: unknown): FieldResult<string> {
  if (typeof raw !== "string" || !DATE_REGEX.test(raw) || !Number.isFinite(Date.parse(raw))) {
    return fail("Date purchased must be a valid date (YYYY-MM-DD).");
  }
  const today = new Date().toISOString().slice(0, 10);
  if (raw > today) {
    return fail("Expense date cannot be in the future.");
  }
  return ok(raw);
}

function validateReceiptFields(candidate: Record<string, unknown>): FieldResult<{
  receiptPath: string;
  receiptMimeType: string;
  receiptSizeBytes: number;
}> {
  const path = typeof candidate.receiptPath === "string" ? candidate.receiptPath.trim() : "";
  if (path.length === 0) {
    return fail("Receipt path must be a non-empty string.");
  }

  const mimeType =
    typeof candidate.receiptMimeType === "string" ? candidate.receiptMimeType.trim() : "";
  if (mimeType.length === 0) {
    return fail("Receipt MIME type must be a non-empty string.");
  }
  if (!ALLOWED_RECEIPT_MIME_TYPES.has(mimeType)) {
    return fail("Receipt must be a JPEG, PNG, WebP, or PDF file.");
  }

  const sizeBytes = candidate.receiptSizeBytes;
  if (typeof sizeBytes !== "number" || !Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    return fail("Receipt size must be a positive integer.");
  }

  return ok({ receiptPath: path, receiptMimeType: mimeType, receiptSizeBytes: sizeBytes });
}

// ---------------------------------------------------------------------------
// Public parsers
// ---------------------------------------------------------------------------

const RECEIPT_FIELDS = ["receiptPath", "receiptMimeType", "receiptSizeBytes"] as const;

export function parseExpenseCreatePayload(input: unknown): {
  data: ExpenseCreatePayload | null;
  error: string | null;
} {
  if (!input || typeof input !== "object") {
    return { data: null, error: "Expense payload is invalid." };
  }

  const c = input as Record<string, unknown>;

  const item = validateItem(c.item);
  if (!item.ok) return { data: null, error: item.error };

  const category = validateCategory(c.category);
  if (!category.ok) return { data: null, error: category.error };

  const amountMinor = validateAmountMinor(c.amountMinor);
  if (!amountMinor.ok) return { data: null, error: amountMinor.error };

  const currencyCode = validateCurrencyCode(c.currencyCode);
  if (!currencyCode.ok) return { data: null, error: currencyCode.error };

  const datePurchased = validateDatePurchased(c.datePurchased);
  if (!datePurchased.ok) return { data: null, error: datePurchased.error };

  return {
    data: {
      item: item.value,
      category: category.value,
      amountMinor: amountMinor.value,
      currencyCode: currencyCode.value,
      datePurchased: datePurchased.value,
    },
    error: null,
  };
}

export function parseExpenseUpdatePayload(input: unknown): {
  data: ExpenseUpdatePayload | null;
  error: string | null;
} {
  if (!input || typeof input !== "object") {
    return { data: null, error: "Expense update payload is invalid." };
  }

  const c = input as Record<string, unknown>;
  const coreFields = ["item", "category", "amountMinor", "currencyCode", "datePurchased"];
  const hasCoreField = coreFields.some((k) => k in c);
  const hasReceiptField = RECEIPT_FIELDS.some((k) => k in c);

  if (!hasCoreField && !hasReceiptField) {
    return { data: null, error: "No updatable fields were provided." };
  }

  const result: ExpenseUpdatePayload = {};

  if ("item" in c) {
    const r = validateItem(c.item);
    if (!r.ok) return { data: null, error: r.error };
    result.item = r.value;
  }

  if ("category" in c) {
    const r = validateCategory(c.category);
    if (!r.ok) return { data: null, error: r.error };
    result.category = r.value;
  }

  if ("amountMinor" in c) {
    const r = validateAmountMinor(c.amountMinor);
    if (!r.ok) return { data: null, error: r.error };
    result.amountMinor = r.value;
  }

  if ("currencyCode" in c) {
    const r = validateCurrencyCode(c.currencyCode);
    if (!r.ok) return { data: null, error: r.error };
    result.currencyCode = r.value;
  }

  if ("datePurchased" in c) {
    const r = validateDatePurchased(c.datePurchased);
    if (!r.ok) return { data: null, error: r.error };
    result.datePurchased = r.value;
  }

  // Receipt fields must all be present together or not at all.
  const presentReceiptFields = RECEIPT_FIELDS.filter((k) => k in c);
  if (presentReceiptFields.length > 0 && presentReceiptFields.length < RECEIPT_FIELDS.length) {
    return {
      data: null,
      error: "Receipt fields (receiptPath, receiptMimeType, receiptSizeBytes) must all be provided together.",
    };
  }

  if (presentReceiptFields.length === RECEIPT_FIELDS.length) {
    const r = validateReceiptFields(c);
    if (!r.ok) return { data: null, error: r.error };
    result.receiptPath = r.value.receiptPath;
    result.receiptMimeType = r.value.receiptMimeType;
    result.receiptSizeBytes = r.value.receiptSizeBytes;
  }

  return { data: result, error: null };
}
