-- Slice 5 foundation: analytics month-window index support.
CREATE INDEX IF NOT EXISTS sessions_user_compensation_session_at_idx
  ON public.sessions (user_id, compensation_version_id, session_at DESC);
