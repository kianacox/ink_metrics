-- Slice 7: Add in_progress flag to sessions for in-progress tattoo tracking.

ALTER TABLE public.sessions
  ADD COLUMN in_progress boolean NOT NULL DEFAULT false;
