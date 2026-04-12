-- Slice 4: Expense receipt storage
-- Creates the expense-receipts storage bucket and per-user RLS policies.

-- Create the private bucket for expense receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Storage RLS policies
-- Users may only read/write objects under their own user_id prefix.
-- Path format: {user_id}/{expense_id}/{timestamp}-{filename}
-- ---------------------------------------------------------------------------

CREATE POLICY "expense_receipts_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'expense-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "expense_receipts_select_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "expense_receipts_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
