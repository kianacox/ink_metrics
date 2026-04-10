-- Deterministic E2E users for local Playwright runs.
-- Password for both users: Password123!

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  session_user_id uuid := '11111111-1111-1111-1111-111111111111';
  incomplete_user_id uuid := '22222222-2222-2222-2222-222222222222';
  session_user_email text := 'seeded-session-user@example.com';
  incomplete_user_email text := 'seeded-incomplete-user@example.com';
begin
  delete from public.artist_compensation_versions
  where user_id in (session_user_id, incomplete_user_id);

  delete from public.profiles
  where user_id in (session_user_id, incomplete_user_id);

  delete from auth.identities
  where user_id in (session_user_id, incomplete_user_id);

  delete from auth.users
  where id in (session_user_id, incomplete_user_id);

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    reauthentication_token,
    phone_change,
    phone_change_token,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values
    (
      '00000000-0000-0000-0000-000000000000',
      session_user_id,
      'authenticated',
      'authenticated',
      session_user_email,
      crypt('Password123!', gen_salt('bf')),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      incomplete_user_id,
      'authenticated',
      'authenticated',
      incomplete_user_email,
      crypt('Password123!', gen_salt('bf')),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now()
    );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at,
    last_sign_in_at
  )
  values
    (
      gen_random_uuid(),
      session_user_id,
      jsonb_build_object('sub', session_user_id::text, 'email', session_user_email),
      'email',
      session_user_email,
      now(),
      now(),
      now()
    ),
    (
      gen_random_uuid(),
      incomplete_user_id,
      jsonb_build_object('sub', incomplete_user_id::text, 'email', incomplete_user_email),
      'email',
      incomplete_user_email,
      now(),
      now(),
      now()
    );

  insert into public.profiles (
    user_id,
    display_name,
    default_currency,
    reporting_timezone,
    week_starts_on,
    is_profile_complete,
    profile_completed_at
  )
  values
    (session_user_id, 'Seeded Session User', 'GBP', 'Europe/London', 1, true, now()),
    (incomplete_user_id, null, 'GBP', 'Europe/London', 1, false, null);

  insert into public.artist_compensation_versions (
    compensation_version_id,
    user_id,
    effective_from,
    effective_to,
    pay_chair_rent,
    rent_type,
    fixed_frequency,
    fixed_amount_minor,
    commission_rate_bps,
    commission_capped,
    commission_cap_frequency,
    commission_cap_amount_minor,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    session_user_id,
    now() - interval '6 months',
    null,
    false,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    now(),
    now()
  );
end $$;
