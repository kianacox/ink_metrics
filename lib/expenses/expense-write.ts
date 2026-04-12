import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseCreatePayload,
  type ExpenseUpdatePayload,
} from "@/lib/expenses/models";

export type { ExpenseCreatePayload, ExpenseUpdatePayload };

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidExpenseDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) {
    return false;
  }
  const ts = Date.parse(value);
  return Number.isFinite(ts);
}

function isFutureDate(value: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return value > today;
}

function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === "string" && EXPENSE_CATEGORIES.includes(value as ExpenseCategory);
}

export function parseExpenseCreatePayload(input: unknown): {
  data: ExpenseCreatePayload | null;
  error: string | null;
} {
  if (!input || typeof input !== "object") {
    return { data: null, error: "Expense payload is invalid." };
  }

  const candidate = input as Record<string, unknown>;

  const item = typeof candidate.item === "string" ? candidate.item.trim() : "";
  if (item.length === 0) {
    return { data: null, error: "Item name is required." };
  }

  if (!isExpenseCategory(candidate.category)) {
    return { data: null, error: "Category is invalid." };
  }

  if (
    typeof candidate.amountMinor !== "number" ||
    !Number.isInteger(candidate.amountMinor) ||
    candidate.amountMinor < 0
  ) {
    return { data: null, error: "Amount must be a non-negative integer." };
  }

  const currencyCode =
    typeof candidate.currencyCode === "string" ? candidate.currencyCode.trim() : "";
  if (currencyCode.length === 0) {
    return { data: null, error: "Currency code is required." };
  }

  if (typeof candidate.datePurchased !== "string" || !isValidExpenseDate(candidate.datePurchased)) {
    return { data: null, error: "Date purchased must be a valid date (YYYY-MM-DD)." };
  }

  if (isFutureDate(candidate.datePurchased)) {
    return { data: null, error: "Expense date cannot be in the future." };
  }

  return {
    data: {
      item,
      category: candidate.category,
      amountMinor: candidate.amountMinor,
      currencyCode,
      datePurchased: candidate.datePurchased,
    },
    error: null,
  };
}

const EXPENSE_UPDATE_CORE_FIELDS = new Set([
  "item",
  "category",
  "amountMinor",
  "currencyCode",
  "datePurchased",
]);

const EXPENSE_UPDATE_RECEIPT_FIELDS = ["receiptPath", "receiptMimeType", "receiptSizeBytes"] as const;

export function parseExpenseUpdatePayload(input: unknown): {
  data: ExpenseUpdatePayload | null;
  error: string | null;
} {
  if (!input || typeof input !== "object") {
    return { data: null, error: "Expense update payload is invalid." };
  }

  const candidate = input as Record<string, unknown>;
  const result: ExpenseUpdatePayload = {};

  const hasCoreField = [...EXPENSE_UPDATE_CORE_FIELDS].some((k) => k in candidate);
  const hasReceiptField = EXPENSE_UPDATE_RECEIPT_FIELDS.some((k) => k in candidate);

  if (!hasCoreField && !hasReceiptField) {
    return { data: null, error: "No updatable fields were provided." };
  }

  if ("item" in candidate) {
    const item = typeof candidate.item === "string" ? candidate.item.trim() : "";
    if (item.length === 0) {
      return { data: null, error: "Item name is required." };
    }
    result.item = item;
  }

  if ("category" in candidate) {
    if (!isExpenseCategory(candidate.category)) {
      return { data: null, error: "Category is invalid." };
    }
    result.category = candidate.category;
  }

  if ("amountMinor" in candidate) {
    if (
      typeof candidate.amountMinor !== "number" ||
      !Number.isInteger(candidate.amountMinor) ||
      candidate.amountMinor < 0
    ) {
      return { data: null, error: "Amount must be a non-negative integer." };
    }
    result.amountMinor = candidate.amountMinor;
  }

  if ("currencyCode" in candidate) {
    const currencyCode =
      typeof candidate.currencyCode === "string" ? candidate.currencyCode.trim() : "";
    if (currencyCode.length === 0) {
      return { data: null, error: "Currency code is required." };
    }
    result.currencyCode = currencyCode;
  }

  if ("datePurchased" in candidate) {
    if (
      typeof candidate.datePurchased !== "string" ||
      !isValidExpenseDate(candidate.datePurchased)
    ) {
      return { data: null, error: "Date purchased must be a valid date (YYYY-MM-DD)." };
    }
    if (isFutureDate(candidate.datePurchased)) {
      return { data: null, error: "Expense date cannot be in the future." };
    }
    result.datePurchased = candidate.datePurchased;
  }

  // Receipt fields must all be present together or not at all
  const presentReceiptFields = EXPENSE_UPDATE_RECEIPT_FIELDS.filter((k) => k in candidate);
  if (presentReceiptFields.length > 0 && presentReceiptFields.length < EXPENSE_UPDATE_RECEIPT_FIELDS.length) {
    return {
      data: null,
      error: "Receipt fields (receiptPath, receiptMimeType, receiptSizeBytes) must all be provided together.",
    };
  }

  if (presentReceiptFields.length === EXPENSE_UPDATE_RECEIPT_FIELDS.length) {
    if (typeof candidate.receiptPath !== "string" || candidate.receiptPath.trim().length === 0) {
      return { data: null, error: "Receipt path must be a non-empty string." };
    }
    if (typeof candidate.receiptMimeType !== "string" || candidate.receiptMimeType.trim().length === 0) {
      return { data: null, error: "Receipt MIME type must be a non-empty string." };
    }
    if (
      typeof candidate.receiptSizeBytes !== "number" ||
      !Number.isInteger(candidate.receiptSizeBytes) ||
      candidate.receiptSizeBytes <= 0
    ) {
      return { data: null, error: "Receipt size must be a positive integer." };
    }
    result.receiptPath = candidate.receiptPath.trim();
    result.receiptMimeType = candidate.receiptMimeType.trim();
    result.receiptSizeBytes = candidate.receiptSizeBytes;
  }

  return { data: result, error: null };
}
