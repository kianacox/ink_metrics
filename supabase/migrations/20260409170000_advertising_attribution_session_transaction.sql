alter table public.profiles
add column if not exists display_advert_checkbox boolean;

alter table public.sessions
add column if not exists through_ads boolean;

alter table public.clients
add column if not exists origin text;

alter table public.clients
drop constraint if exists clients_origin_check;

alter table public.clients
add constraint clients_origin_check
check (origin is null or origin in ('advertising', 'organic'));

create or replace function public.create_session_with_optional_client(
  p_selected_client_id uuid,
  p_create_new_client boolean,
  p_client_name text,
  p_client_contact text,
  p_price_minor bigint,
  p_session_duration_minutes integer,
  p_session_at timestamp with time zone,
  p_through_ads boolean default null
)
returns table (
  session_id uuid,
  created_client_id uuid,
  created_client_name text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  resolved_client_id uuid;
  inserted_session_id uuid;
  active_compensation_version_id uuid;
  profile_allows_advert_checkbox boolean := false;
  normalized_client_name text := btrim(coalesce(p_client_name, ''));
  normalized_client_contact text := nullif(btrim(coalesce(p_client_contact, '')), '');
  normalized_through_ads boolean;
  normalized_client_origin text;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to log a session.';
  end if;

  select coalesce(display_advert_checkbox, false)
  into profile_allows_advert_checkbox
  from public.profiles
  where user_id = current_user_id
  limit 1;

  if profile_allows_advert_checkbox and p_create_new_client then
    normalized_through_ads := coalesce(p_through_ads, false);
  else
    normalized_through_ads := null;
  end if;

  if p_create_new_client then
    if normalized_client_name = '' then
      raise exception 'Client name is required for a new client.';
    end if;

    if exists (
      select 1
      from public.clients
      where user_id = current_user_id
        and lower(btrim(name)) = lower(normalized_client_name)
    ) then
      raise exception 'A client with this name already exists. Choose it from Existing client.';
    end if;

    if profile_allows_advert_checkbox then
      normalized_client_origin := case
        when normalized_through_ads then 'advertising'
        else 'organic'
      end;
    else
      normalized_client_origin := null;
    end if;

    insert into public.clients (
      client_id,
      user_id,
      name,
      contact_info,
      origin
    )
    values (
      gen_random_uuid(),
      current_user_id,
      normalized_client_name,
      normalized_client_contact,
      normalized_client_origin
    )
    returning client_id, name
    into resolved_client_id, created_client_name;

    created_client_id := resolved_client_id;
  else
    if p_selected_client_id is null then
      raise exception 'Select an existing client before saving.';
    end if;

    select client_id
    into resolved_client_id
    from public.clients
    where user_id = current_user_id
      and client_id = p_selected_client_id
    limit 1;

    if resolved_client_id is null then
      raise exception 'Selected client was not found.';
    end if;

    created_client_id := null;
    created_client_name := null;
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

  insert into public.sessions (
    session_id,
    user_id,
    client_id,
    price,
    session_duration,
    session_at,
    compensation_version_id,
    through_ads
  )
  values (
    gen_random_uuid(),
    current_user_id,
    resolved_client_id,
    p_price_minor,
    p_session_duration_minutes,
    p_session_at,
    active_compensation_version_id,
    normalized_through_ads
  )
  returning public.sessions.session_id
  into inserted_session_id;

  session_id := inserted_session_id;
  return next;
end;
$$;

revoke all on function public.create_session_with_optional_client(
  uuid,
  boolean,
  text,
  text,
  bigint,
  integer,
  timestamp with time zone,
  boolean
) from public;

grant execute on function public.create_session_with_optional_client(
  uuid,
  boolean,
  text,
  text,
  bigint,
  integer,
  timestamp with time zone,
  boolean
) to authenticated;

grant execute on function public.create_session_with_optional_client(
  uuid,
  boolean,
  text,
  text,
  bigint,
  integer,
  timestamp with time zone,
  boolean
) to service_role;
