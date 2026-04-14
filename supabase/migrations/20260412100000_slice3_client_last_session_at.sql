-- Slice 3 extension: add last_session_at to fetch_clients_page
-- Returns the most recent session_at for each client (null if no sessions).
--
-- PostgreSQL does not allow CREATE OR REPLACE to change a function's return
-- type, so we drop the existing function first.
DROP FUNCTION IF EXISTS fetch_clients_page(uuid, timestamptz, text, text, integer, integer);
DROP FUNCTION IF EXISTS fetch_clients_page(timestamptz, text, text, integer, integer);

CREATE OR REPLACE FUNCTION fetch_clients_page(
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
  last_session_at            timestamptz,
  lifetime_session_count     bigint,
  lifetime_total_value_minor numeric,
  range_session_count        bigint,
  range_total_value_minor    numeric,
  total_count                bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_search text := trim(p_search);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to list clients.';
  END IF;

  RETURN QUERY
  WITH
  -- Lifetime aggregates per client owned by this user
  lifetime_agg AS (
    SELECT
      s.client_id,
      count(*)                     AS session_count,
      coalesce(sum(s.price), 0)    AS total_value,
      max(s.session_at)            AS last_session_at
    FROM sessions s
    WHERE s.user_id = v_user_id
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
    WHERE s.user_id = v_user_id
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
      la.last_session_at,
      coalesce(la.session_count, 0) AS lifetime_session_count,
      coalesce(la.total_value,   0) AS lifetime_total_value_minor,
      coalesce(ra.session_count, 0) AS range_session_count,
      coalesce(ra.total_value,   0) AS range_total_value_minor
    FROM clients c
    LEFT JOIN lifetime_agg la ON la.client_id = c.client_id
    LEFT JOIN range_agg     ra ON ra.client_id = c.client_id
    WHERE c.user_id = v_user_id
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
    counted.last_session_at,
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

GRANT EXECUTE ON FUNCTION fetch_clients_page(timestamptz, text, text, integer, integer)
  TO authenticated;
