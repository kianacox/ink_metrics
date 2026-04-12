-- Slice 4: Expense Tracking
-- Creates the expenses table with RLS, category check constraint, and indexes.

CREATE TABLE public.expenses (
  expense_id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item               text        NOT NULL,
  category           text        NOT NULL CHECK (category IN (
                                   'ink',
                                   'cartridges',
                                   'needles',
                                   'machines',
                                   'other_equipment',
                                   'travel',
                                   'miscellaneous'
                                 )),
  amount_minor       bigint      NOT NULL,
  currency_code      text        NOT NULL,
  date_purchased     date        NOT NULL,
  receipt_path       text        NULL,
  receipt_mime_type  text        NULL,
  receipt_size_bytes integer     NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select_own"
  ON public.expenses
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "expenses_insert_own"
  ON public.expenses
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "expenses_update_own"
  ON public.expenses
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "expenses_delete_own"
  ON public.expenses
  FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Default list query: sort by date descending per user
CREATE INDEX ON public.expenses (user_id, date_purchased DESC);

-- Category filter query
CREATE INDEX ON public.expenses (user_id, category);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
