-- Slice 3: Client Tracking
-- Adds fetch_clients_page, create_client, and update_client RPCs.

-- ---------------------------------------------------------------------------
-- fetch_clients_page
-- Returns paginated client rows with lifetime and date-range-bounded
-- session aggregates. Inclusion rule: the client was created in the range
-- OR has at least one session in the range (when p_date_range_start is not
-- null). When p_date_range_start is null all clients are included (all time).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fetch_clients_page(
  p_user_id          uuid,
  p_date_range_start timestamptz,   -- null = all time
  p_search           text,          -- '' = no filter
  p_sort_by          text,          -- 'session_count' | 'total_value'
  p_page_size        integer,
  p_offset           integer
)
RETURNS TABLE (
  client_id                  uuid,
  name                       text,
  contact_info               text,
  created_at                 timestamptz,
  lifetime_session_count     bigint,
  lifetime_total_value_minor numeric,
  range_session_count        bigint,
  range_total_value_minor    numeric,
  total_count                bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := trim(p_search);
BEGIN
  RETURN QUERY
  WITH
  -- Lifetime aggregates per client owned by this user
  lifetime_agg AS (
    SELECT
      s.client_id,
      count(*)    AS session_count,
      coalesce(sum(s.price), 0) AS total_value
    FROM sessions s
    WHERE s.user_id = p_user_id
      AND s.client_id IS NOT NULL
    GROUP BY s.client_id
  ),

  -- Range-bounded aggregates per client
  range_agg AS (
    SELECT
      s.client_id,
      count(*)    AS session_count,
      coalesce(sum(s.price), 0) AS total_value
    FROM sessions s
    WHERE s.user_id = p_user_id
      AND s.client_id IS NOT NULL
      AND (p_date_range_start IS NULL OR s.session_at >= p_date_range_start)
    GROUP BY s.client_id
  ),

  -- All clients owned by this user, with aggregates joined in
  clients_with_agg AS (
    SELECT
      c.client_id,
      c.name,
      c.contact_info,
      c.created_at,
      coalesce(la.session_count, 0) AS lifetime_session_count,
      coalesce(la.total_value,   0) AS lifetime_total_value_minor,
      coalesce(ra.session_count, 0) AS range_session_count,
      coalesce(ra.total_value,   0) AS range_total_value_minor
    FROM clients c
    LEFT JOIN lifetime_agg la ON la.client_id = c.client_id
    LEFT JOIN range_agg     ra ON ra.client_id = c.client_id
    WHERE c.user_id = p_user_id
      -- Inclusion rule: created in range OR has a session in range
      AND (
        p_date_range_start IS NULL
        OR c.created_at >= p_date_range_start
        OR ra.session_count > 0
      )
      -- Optional name search (case-insensitive)
      AND (
        v_search = ''
        OR c.name ILIKE '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      )
  ),

  -- Total count for pagination metadata
  counted AS (
    SELECT *, count(*) OVER () AS total_count
    FROM clients_with_agg
  )

  SELECT
    counted.client_id,
    counted.name,
    counted.contact_info,
    counted.created_at,
    counted.lifetime_session_count,
    counted.lifetime_total_value_minor,
    counted.range_session_count,
    counted.range_total_value_minor,
    counted.total_count
  FROM counted
  ORDER BY
    CASE WHEN p_sort_by = 'session_count' THEN counted.range_session_count     END DESC,
    CASE WHEN p_sort_by = 'total_value'   THEN counted.range_total_value_minor END DESC,
    counted.client_id ASC
  LIMIT p_page_size
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION fetch_clients_page(uuid, timestamptz, text, text, integer, integer)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- create_client
-- Creates a new client for the currently authenticated user.
-- Raises an exception if a client with the same name already exists.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_client(
  p_name         text,
  p_contact_info text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_client_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to create a client.';
  END IF;

  IF trim(p_name) = '' THEN
    RAISE EXCEPTION 'Client name is required.';
  END IF;

  -- Uniqueness check (case-insensitive) per user
  IF EXISTS (
    SELECT 1 FROM clients
    WHERE user_id = v_user_id
      AND lower(name) = lower(trim(p_name))
  ) THEN
    RAISE EXCEPTION 'A client with this name already exists.';
  END IF;

  INSERT INTO clients (client_id, user_id, name, contact_info)
  VALUES (gen_random_uuid(), v_user_id, trim(p_name), nullif(trim(coalesce(p_contact_info, '')), ''))
  RETURNING client_id INTO v_client_id;

  RETURN v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_client(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- update_client
-- Updates name and contact_info for an owned client.
-- Raises an exception if the new name conflicts with another client.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_client(
  p_client_id    uuid,
  p_name         text,
  p_contact_info text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to update a client.';
  END IF;

  IF trim(p_name) = '' THEN
    RAISE EXCEPTION 'Client name is required.';
  END IF;

  -- Ensure the client exists and is owned by this user
  IF NOT EXISTS (
    SELECT 1 FROM clients
    WHERE client_id = p_client_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Client was not found.';
  END IF;

  -- Uniqueness check: another client (not this one) with the same name
  IF EXISTS (
    SELECT 1 FROM clients
    WHERE user_id = v_user_id
      AND lower(name) = lower(trim(p_name))
      AND client_id <> p_client_id
  ) THEN
    RAISE EXCEPTION 'A client with this name already exists.';
  END IF;

  UPDATE clients
  SET
    name         = trim(p_name),
    contact_info = nullif(trim(coalesce(p_contact_info, '')), '')
  WHERE client_id = p_client_id
    AND user_id   = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_client(uuid, text, text) TO authenticated;
