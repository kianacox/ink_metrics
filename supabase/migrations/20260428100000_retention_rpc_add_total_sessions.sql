-- Extend compute_lifetime_client_retention to return total lifetime session count.
-- Used by the dashboard to determine whether enough data exists to show the retention metric.

drop function if exists public.compute_lifetime_client_retention(uuid);

create or replace function public.compute_lifetime_client_retention(
  p_user_id uuid
)
returns table (
  unique_clients_total bigint,
  clients_with_2plus_sessions_total bigint,
  total_sessions bigint
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

  return query
  with client_session_counts as (
    select
      s.client_id,
      count(*)::bigint as session_count
    from public.sessions as s
    where s.user_id = p_user_id
      and s.client_id is not null
    group by s.client_id
  )
  select
    count(*)::bigint as unique_clients_total,
    count(*) filter (where session_count >= 2)::bigint as clients_with_2plus_sessions_total,
    coalesce(sum(session_count), 0)::bigint as total_sessions
  from client_session_counts;
end;
$$;

revoke all on function public.compute_lifetime_client_retention(uuid) from public;

grant execute on function public.compute_lifetime_client_retention(uuid) to authenticated;

grant execute on function public.compute_lifetime_client_retention(uuid) to service_role;
