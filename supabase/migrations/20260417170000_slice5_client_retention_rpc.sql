create or replace function public.compute_dashboard_client_retention(
  p_user_id uuid,
  p_month_start_utc timestamp with time zone,
  p_month_end_utc timestamp with time zone,
  p_reporting_timezone text,
  p_month_start_local_date date,
  p_month_end_local_date date
)
returns table (
  unique_clients_in_month bigint,
  clients_with_2plus_sessions_in_month bigint
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'You must be signed in to view dashboard analytics.';
  end if;

  if p_user_id is null or p_user_id <> current_user_id then
    raise exception 'Not authorized to read dashboard analytics for this user.';
  end if;

  if p_month_start_utc is null
     or p_month_end_utc is null
     or p_month_end_utc <= p_month_start_utc then
    raise exception 'Invalid month window.';
  end if;

  if p_reporting_timezone is null or btrim(p_reporting_timezone) = '' then
    raise exception 'A reporting timezone is required.';
  end if;

  if p_month_start_local_date is null
     or p_month_end_local_date is null
     or p_month_end_local_date <= p_month_start_local_date then
    raise exception 'Invalid local month window.';
  end if;

  return query
  with client_session_counts as (
    select
      s.client_id,
      count(*)::bigint as session_count
    from public.sessions as s
    where s.user_id = p_user_id
      and s.client_id is not null
      and s.session_at >= p_month_start_utc
      and s.session_at < p_month_end_utc
    group by s.client_id
  )
  select
    count(*)::bigint as unique_clients_in_month,
    count(*) filter (where session_count >= 2)::bigint as clients_with_2plus_sessions_in_month
  from client_session_counts;
end;
$$;

revoke all on function public.compute_dashboard_client_retention(
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  text,
  date,
  date
) from public;

grant execute on function public.compute_dashboard_client_retention(
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  text,
  date,
  date
) to authenticated;

grant execute on function public.compute_dashboard_client_retention(
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  text,
  date,
  date
) to service_role;
