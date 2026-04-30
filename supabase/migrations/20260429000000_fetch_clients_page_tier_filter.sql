-- Add server-side tier filter to fetch_clients_page.
-- Tier classification is based on lifetime_session_count:
--   vip:        >= 5 sessions
--   regular:    2-4 sessions
--   one-timer:  <= 1 session
-- A null p_tier returns all clients (existing behaviour).

DROP FUNCTION IF EXISTS fetch_clients_page(uuid, date, text, text, integer, numeric, uuid);

CREATE OR REPLACE FUNCTION fetch_clients_page(
  p_user_id            uuid,
  p_date_range_start   date,          -- null = all time
  p_search             text,          -- '' = no filter
  p_sort_by            text,          -- 'session_count' | 'total_value'
  p_page_size          integer,
  p_cursor_sort_value  numeric,       -- null = first page
  p_cursor_client_id   uuid,          -- null = first page
  p_tier               text           -- null = all, 'vip' | 'regular' | 'one-timer'
)
RETURNS TABLE (
  client_id                  uuid,
  name                       text,
  contact_info               text,
  created_at                 timestamptz,
  last_session_at            date,
  lifetime_session_count     bigint,
  lifetime_total_value_minor numeric,
  range_session_count        bigint,
  range_total_value_minor    numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_search text := trim(p_search);
  v_sort_by text := CASE WHEN p_sort_by = 'total_value' THEN 'total_value' ELSE 'session_count' END;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to list clients.';
  END IF;

  IF p_user_id IS NULL OR p_user_id <> v_user_id THEN
    RAISE EXCEPTION 'You are not allowed to list clients for another user.';
  END IF;

  IF p_page_size IS NULL OR p_page_size < 1 THEN
    RAISE EXCEPTION 'Page size must be at least 1.';
  END IF;

  IF (p_cursor_sort_value IS NULL) <> (p_cursor_client_id IS NULL) THEN
    RAISE EXCEPTION 'Cursor sort value and cursor client id must be provided together.';
  END IF;

  RETURN QUERY
  WITH
  lifetime_agg AS (
    SELECT
      s.client_id,
      count(*)                  AS session_count,
      coalesce(sum(s.price), 0) AS total_value,
      max(s.session_at)         AS last_session_at
    FROM sessions s
    WHERE s.user_id = p_user_id
      AND s.client_id IS NOT NULL
    GROUP BY s.client_id
  ),
  range_agg AS (
    SELECT
      s.client_id,
      count(*)                  AS session_count,
      coalesce(sum(s.price), 0) AS total_value
    FROM sessions s
    WHERE s.user_id = p_user_id
      AND s.client_id IS NOT NULL
      AND (p_date_range_start IS NULL OR s.session_at >= p_date_range_start)
    GROUP BY s.client_id
  ),
  clients_with_agg AS (
    SELECT
      c.client_id,
      c.name,
      c.contact_info,
      c.created_at,
      la.last_session_at,
      coalesce(la.session_count, 0) AS lifetime_session_count,
      coalesce(la.total_value, 0)   AS lifetime_total_value_minor,
      coalesce(ra.session_count, 0) AS range_session_count,
      coalesce(ra.total_value, 0)   AS range_total_value_minor
    FROM clients c
    LEFT JOIN lifetime_agg la ON la.client_id = c.client_id
    LEFT JOIN range_agg ra ON ra.client_id = c.client_id
    WHERE c.user_id = p_user_id
      AND (
        p_date_range_start IS NULL
        OR c.created_at >= p_date_range_start::timestamptz
        OR ra.session_count > 0
      )
      AND (
        v_search = ''
        OR c.name ILIKE '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      )
      AND (
        p_tier IS NULL
        OR (p_tier = 'vip'        AND coalesce(la.session_count, 0) >= 5)
        OR (p_tier = 'regular'    AND coalesce(la.session_count, 0) BETWEEN 2 AND 4)
        OR (p_tier = 'one-timer'  AND coalesce(la.session_count, 0) <= 1)
      )
  )
  SELECT
    cwa.client_id,
    cwa.name,
    cwa.contact_info,
    cwa.created_at,
    cwa.last_session_at,
    cwa.lifetime_session_count,
    cwa.lifetime_total_value_minor,
    cwa.range_session_count,
    cwa.range_total_value_minor
  FROM clients_with_agg cwa
  WHERE
    p_cursor_sort_value IS NULL
    OR (
      v_sort_by = 'session_count'
      AND (
        cwa.range_session_count < p_cursor_sort_value
        OR (
          cwa.range_session_count = p_cursor_sort_value
          AND cwa.client_id < p_cursor_client_id
        )
      )
    )
    OR (
      v_sort_by = 'total_value'
      AND (
        cwa.range_total_value_minor < p_cursor_sort_value
        OR (
          cwa.range_total_value_minor = p_cursor_sort_value
          AND cwa.client_id < p_cursor_client_id
        )
      )
    )
  ORDER BY
    CASE WHEN v_sort_by = 'session_count' THEN cwa.range_session_count END DESC,
    CASE WHEN v_sort_by = 'total_value' THEN cwa.range_total_value_minor END DESC,
    cwa.client_id DESC
  LIMIT p_page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION fetch_clients_page(uuid, date, text, text, integer, numeric, uuid, text)
  TO authenticated;
