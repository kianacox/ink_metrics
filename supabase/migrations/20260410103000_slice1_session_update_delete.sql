create or replace function public.update_owned_session(
  p_session_id uuid,
  p_price_minor bigint,
  p_session_duration_minutes integer,
  p_session_at timestamp with time zone
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  active_compensation_version_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to update a session.';
  end if;

  if not exists (
    select 1
    from public.sessions
    where session_id = p_session_id
      and user_id = current_user_id
  ) then
    raise exception 'Session was not found.';
  end if;

  select compensation_version_id
  into active_compensation_version_id
  from public.artist_compensation_versions
  where user_id = current_user_id
    and effective_from <= p_session_at
    and (effective_to is null or effective_to > p_session_at)
  order by effective_from desc
  limit 1;

  if active_compensation_version_id is null then
    raise exception 'No compensation settings are active for this session date/time.';
  end if;

  update public.sessions
  set
    price = p_price_minor,
    session_duration = p_session_duration_minutes,
    session_at = p_session_at,
    compensation_version_id = active_compensation_version_id
  where session_id = p_session_id
    and user_id = current_user_id;
end;
$$;

revoke all on function public.update_owned_session(
  uuid,
  bigint,
  integer,
  timestamp with time zone
) from public;

grant execute on function public.update_owned_session(
  uuid,
  bigint,
  integer,
  timestamp with time zone
) to authenticated;

grant execute on function public.update_owned_session(
  uuid,
  bigint,
  integer,
  timestamp with time zone
) to service_role;
