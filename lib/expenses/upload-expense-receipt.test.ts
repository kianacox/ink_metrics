import { validateReceiptFile, uploadExpenseReceipt, isUploadError } from "./upload-expense-receipt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile({
  name = "receipt.jpg",
  type = "image/jpeg",
  size = 1024,
}: { name?: string; type?: string; size?: number } = {}): File {
  const blob = new Blob(["x".repeat(size)], { type });
  return new File([blob], name, { type });
}

const FIVE_MB = 5 * 1024 * 1024;

// ---------------------------------------------------------------------------
// validateReceiptFile
// ---------------------------------------------------------------------------

describe("validateReceiptFile", () => {
  it("returns null for a valid JPEG under 5 MB", () => {
    expect(validateReceiptFile(makeFile())).toBeNull();
  });

  it("returns null for a valid PNG", () => {
    expect(validateReceiptFile(makeFile({ type: "image/png", name: "r.png" }))).toBeNull();
  });

  it("returns null for a valid WebP", () => {
    expect(validateReceiptFile(makeFile({ type: "image/webp", name: "r.webp" }))).toBeNull();
  });

  it("returns null for a valid PDF", () => {
    expect(validateReceiptFile(makeFile({ type: "application/pdf", name: "r.pdf" }))).toBeNull();
  });

  it("rejects files exceeding 5 MB", () => {
    const err = validateReceiptFile(makeFile({ size: FIVE_MB + 1 }));
    expect(err).toBe("Receipt file must be 5 MB or smaller.");
  });

  it("accepts files exactly at the 5 MB limit", () => {
    expect(validateReceiptFile(makeFile({ size: FIVE_MB }))).toBeNull();
  });

  it("rejects unsupported MIME types", () => {
    const err = validateReceiptFile(makeFile({ type: "image/gif", name: "r.gif" }));
    expect(err).toBe("Receipt must be a JPEG, PNG, WebP, or PDF file.");
  });

  it("rejects text files", () => {
    const err = validateReceiptFile(makeFile({ type: "text/plain", name: "r.txt" }));
    expect(err).toBe("Receipt must be a JPEG, PNG, WebP, or PDF file.");
  });
});

// ---------------------------------------------------------------------------
// isUploadError
// ---------------------------------------------------------------------------

describe("isUploadError", () => {
  it("returns true when result has an error field", () => {
    expect(isUploadError({ error: "something went wrong" })).toBe(true);
  });

  it("returns false when result is a success", () => {
    expect(isUploadError({ path: "a/b/c.jpg", mimeType: "image/jpeg", sizeBytes: 100 })).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// uploadExpenseReceipt — mocked supabase
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

import { createClient } from "@/lib/supabase/client";

const mockedCreateClient = jest.mocked(createClient);

function buildSupabase({
  userId,
  uploadError = null,
}: {
  userId: string | null;
  uploadError?: { message: string } | null;
}) {
  const upload = jest.fn().mockResolvedValue({ error: uploadError });
  const storage = { from: jest.fn(() => ({ upload })) };
  const auth = {
    getUser: jest.fn().mockResolvedValue({
      data: { user: userId ? { id: userId } : null },
    }),
  };
  return { auth, storage } as never;
}

describe("uploadExpenseReceipt", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns an error when the file fails validation", async () => {
    const supabase = buildSupabase({ userId: "u-1" });
    mockedCreateClient.mockReturnValue(supabase);

    const oversized = makeFile({ size: FIVE_MB + 1 });
    const result = await uploadExpenseReceipt({ expenseId: "exp-1", file: oversized });

    expect(isUploadError(result)).toBe(true);
    if (isUploadError(result)) {
      expect(result.error).toBe("Receipt file must be 5 MB or smaller.");
    }
  });

  it("returns an error when the user is not signed in", async () => {
    const supabase = buildSupabase({ userId: null });
    mockedCreateClient.mockReturnValue(supabase);

    const result = await uploadExpenseReceipt({ expenseId: "exp-1", file: makeFile() });

    expect(isUploadError(result)).toBe(true);
    if (isUploadError(result)) {
      expect(result.error).toBe("You must be signed in to upload a receipt.");
    }
  });

  it("returns an error when the storage upload fails", async () => {
    const supabase = buildSupabase({ userId: "u-1", uploadError: { message: "storage error" } });
    mockedCreateClient.mockReturnValue(supabase);

    const result = await uploadExpenseReceipt({ expenseId: "exp-1", file: makeFile() });

    expect(isUploadError(result)).toBe(true);
    if (isUploadError(result)) {
      expect(result.error).toBe("Could not upload receipt. Please try again.");
    }
  });

  it("returns path, mimeType, and sizeBytes on success", async () => {
    const supabase = buildSupabase({ userId: "u-1" });
    mockedCreateClient.mockReturnValue(supabase);

    const file = makeFile({ name: "my receipt.jpg", type: "image/jpeg", size: 2048 });
    const result = await uploadExpenseReceipt({ expenseId: "exp-1", file });

    expect(isUploadError(result)).toBe(false);
    if (!isUploadError(result)) {
      expect(result.path).toMatch(/^u-1\/exp-1\//);
      expect(result.path).toContain("my-receipt.jpg");
      expect(result.mimeType).toBe("image/jpeg");
      expect(result.sizeBytes).toBe(2048);
    }
  });

  it("sanitizes special characters in the file name", async () => {
    const supabase = buildSupabase({ userId: "u-1" });
    mockedCreateClient.mockReturnValue(supabase);

    const file = makeFile({ name: "My Receipt (2026)!.jpg", type: "image/jpeg" });
    const result = await uploadExpenseReceipt({ expenseId: "exp-1", file });

    expect(isUploadError(result)).toBe(false);
    if (!isUploadError(result)) {
      expect(result.path).not.toMatch(/[^a-z0-9.\-_/]/);
    }
  });
});
