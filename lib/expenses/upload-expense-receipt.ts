import { createClient } from "@/lib/supabase/client";

const RECEIPT_BUCKET = "expense-receipts";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export interface UploadReceiptSuccess {
  path: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadReceiptError {
  error: string;
}

export type UploadReceiptResult = UploadReceiptSuccess | UploadReceiptError;

export function isUploadError(result: UploadReceiptResult): result is UploadReceiptError {
  return "error" in result;
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-{2,}/g, "-");
}

export function validateReceiptFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Receipt file must be 5 MB or smaller.";
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Receipt must be a JPEG, PNG, WebP, or PDF file.";
  }
  return null;
}

export async function uploadExpenseReceipt({
  expenseId,
  file,
}: {
  expenseId: string;
  file: File;
}): Promise<UploadReceiptResult> {
  const validationError = validateReceiptFile(file);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to upload a receipt." };
  }

  const timestamp = Date.now();
  const sanitizedName = sanitizeFileName(file.name);
  const path = `${user.id}/${expenseId}/${timestamp}-${sanitizedName}`;

  const { error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return { error: "Could not upload receipt. Please try again." };
  }

  return {
    path,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}
