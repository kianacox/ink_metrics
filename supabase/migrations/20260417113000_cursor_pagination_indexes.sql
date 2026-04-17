-- Composite indexes for cursor pagination and multitenant filters.

-- Sessions cursor pagination (sort=date)
CREATE INDEX IF NOT EXISTS sessions_user_session_at_session_id_idx
  ON public.sessions (user_id, session_at DESC, session_id DESC);

-- Sessions cursor pagination (sort=duration)
CREATE INDEX IF NOT EXISTS sessions_user_duration_session_id_idx
  ON public.sessions (user_id, session_duration DESC, session_id DESC);

-- Sessions cursor pagination (sort=profit)
CREATE INDEX IF NOT EXISTS sessions_user_price_session_id_idx
  ON public.sessions (user_id, price DESC, session_id DESC);

-- Clients RPC aggregates: by user + client and by user + date range.
CREATE INDEX IF NOT EXISTS sessions_user_client_id_idx
  ON public.sessions (user_id, client_id);

CREATE INDEX IF NOT EXISTS sessions_user_session_at_client_id_idx
  ON public.sessions (user_id, session_at DESC, client_id);

-- Expenses cursor pagination.
CREATE INDEX IF NOT EXISTS expenses_user_date_expense_id_idx
  ON public.expenses (user_id, date_purchased DESC, expense_id DESC);

-- Expenses category-filter + cursor pagination.
CREATE INDEX IF NOT EXISTS expenses_user_category_date_expense_id_idx
  ON public.expenses (user_id, category, date_purchased DESC, expense_id DESC);

-- Clients table filtering for user/date windows.
CREATE INDEX IF NOT EXISTS clients_user_created_client_id_idx
  ON public.clients (user_id, created_at DESC, client_id DESC);
