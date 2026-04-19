-- Slice 7: Client actions persistence table with RLS and indexes.

CREATE TABLE public.client_actions (
  action_id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id              uuid        NOT NULL REFERENCES public.clients(client_id) ON DELETE CASCADE,
  action_type            text        NOT NULL,
  session_id             uuid        REFERENCES public.sessions(session_id) ON DELETE CASCADE,
  revenue_at_risk_minor  integer,
  dismissed_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_actions_type_check
    CHECK (action_type IN ('lapsed_repeat', 'new_client', 'in_progress')),
  UNIQUE (user_id, client_id, action_type)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.client_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_actions_manage_own"
  ON public.client_actions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Fast lookup of active (non-dismissed) actions per user
CREATE INDEX client_actions_user_active_idx
  ON public.client_actions (user_id, dismissed_at)
  WHERE dismissed_at IS NULL;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_actions TO authenticated;
