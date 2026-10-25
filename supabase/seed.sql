-- Deterministic E2E users for local Playwright runs.
-- Password for both users: Password123!
-- Password for demo user: Password123

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  session_user_id uuid := '11111111-1111-1111-1111-111111111111';
  incomplete_user_id uuid := '22222222-2222-2222-2222-222222222222';
  demo_user_id uuid := '33333333-3333-3333-3333-333333333333';
  tz_user_id uuid := '44444444-4444-4444-4444-444444444444';
  la_user_id uuid := '55555555-5555-5555-5555-555555555555';
  -- Retention QA users: thin (below threshold → message) and boundary (at threshold → real rate)
  retention_thin_id uuid := '66666666-6666-6666-6666-666666666666';
  retention_boundary_id uuid := '77777777-7777-7777-7777-777777777777';
  session_user_email text := 'seeded-session-user@example.com';
  incomplete_user_email text := 'seeded-incomplete-user@example.com';
  demo_user_email text := 'test@test.com';
  tz_user_email text := 'seeded-tz-user@example.com';
  la_user_email text := 'seeded-la-user@example.com';
  retention_thin_email text := 'seeded-retention-thin@example.com';
  retention_boundary_email text := 'seeded-retention-boundary@example.com';
begin
  -- -------------------------------------------------------------------------
  -- Cleanup (order matters: child tables first)
  -- -------------------------------------------------------------------------

  delete from public.expenses
  where user_id in (demo_user_id, la_user_id);

  delete from public.sessions
  where user_id in (demo_user_id, tz_user_id, la_user_id, retention_thin_id, retention_boundary_id);

  delete from public.clients
  where user_id in (demo_user_id, tz_user_id, la_user_id, retention_thin_id, retention_boundary_id);

  delete from public.artist_compensation_versions
  where user_id in (session_user_id, incomplete_user_id, demo_user_id, tz_user_id, la_user_id, retention_thin_id, retention_boundary_id);

  delete from public.profiles
  where user_id in (session_user_id, incomplete_user_id, demo_user_id, tz_user_id, la_user_id, retention_thin_id, retention_boundary_id);

  delete from auth.identities
  where user_id in (session_user_id, incomplete_user_id, demo_user_id, tz_user_id, la_user_id, retention_thin_id, retention_boundary_id);

  delete from auth.users
  where id in (session_user_id, incomplete_user_id, demo_user_id, tz_user_id, la_user_id, retention_thin_id, retention_boundary_id);

  -- -------------------------------------------------------------------------
  -- Auth users
  -- -------------------------------------------------------------------------

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
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      demo_user_id,
      'authenticated',
      'authenticated',
      demo_user_email,
      crypt('Password123', gen_salt('bf')),
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
      tz_user_id,
      'authenticated',
      'authenticated',
      tz_user_email,
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
      la_user_id,
      'authenticated',
      'authenticated',
      la_user_email,
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
      retention_thin_id,
      'authenticated',
      'authenticated',
      retention_thin_email,
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
      retention_boundary_id,
      'authenticated',
      'authenticated',
      retention_boundary_email,
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

  -- -------------------------------------------------------------------------
  -- Auth identities
  -- -------------------------------------------------------------------------

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
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      jsonb_build_object('sub', demo_user_id::text, 'email', demo_user_email),
      'email',
      demo_user_email,
      now(),
      now(),
      now()
    ),
    (
      gen_random_uuid(),
      tz_user_id,
      jsonb_build_object('sub', tz_user_id::text, 'email', tz_user_email),
      'email',
      tz_user_email,
      now(),
      now(),
      now()
    ),
    (
      gen_random_uuid(),
      la_user_id,
      jsonb_build_object('sub', la_user_id::text, 'email', la_user_email),
      'email',
      la_user_email,
      now(),
      now(),
      now()
    ),
    (
      gen_random_uuid(),
      retention_thin_id,
      jsonb_build_object('sub', retention_thin_id::text, 'email', retention_thin_email),
      'email',
      retention_thin_email,
      now(),
      now(),
      now()
    ),
    (
      gen_random_uuid(),
      retention_boundary_id,
      jsonb_build_object('sub', retention_boundary_id::text, 'email', retention_boundary_email),
      'email',
      retention_boundary_email,
      now(),
      now(),
      now()
    );

  -- -------------------------------------------------------------------------
  -- Profiles
  -- -------------------------------------------------------------------------

  insert into public.profiles (
    user_id,
    display_name,
    default_currency,
    reporting_timezone,
    week_starts_on,
    is_profile_complete,
    profile_completed_at,
    trial_started_at
  )
  values
    (session_user_id, 'Seeded Session User', 'GBP', 'Europe/London', 1, true, now(), now()),
    (incomplete_user_id, null, 'GBP', 'Europe/London', 1, false, null, now()),
    (demo_user_id, 'Demo Artist', 'GBP', 'Europe/London', 1, true, now(), now()),
    -- Asia/Tokyo (UTC+9): used for timezone edge-case QA
    (tz_user_id, 'Tokyo TZ User', 'USD', 'Asia/Tokyo', 1, true, now(), now()),
    -- America/Los_Angeles (UTC-8): used for behind-UTC timezone QA
    (la_user_id, 'LA TZ User', 'USD', 'America/Los_Angeles', 1, true, now(), now()),
    -- Retention QA: thin user (2 sessions, 2 clients) → message shows
    (retention_thin_id, 'Retention Thin User', 'GBP', 'Europe/London', 1, true, now(), now()),
    -- Retention QA: boundary user (4 sessions, 3 clients, 1 returning) → 33% shows
    (retention_boundary_id, 'Retention Boundary User', 'GBP', 'Europe/London', 1, true, now(), now());

  -- -------------------------------------------------------------------------
  -- Compensation versions
  -- -------------------------------------------------------------------------

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
  values
    (
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
    ),
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      demo_user_id,
      now() - interval '6 months',
      null,
      true,
      'commission',
      null,
      null,
      2500,
      true,
      'weekly',
      25000,
      now(),
      now()
    ),
    (
      'bbbbbbbb-0000-0000-0000-000000000001',
      tz_user_id,
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
    ),
    (
      '55555555-5555-5555-5555-000000000001',
      la_user_id,
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
    ),
    (
      '66666666-6666-6666-6666-000000000001',
      retention_thin_id,
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
    ),
    (
      '77777777-7777-7777-7777-000000000001',
      retention_boundary_id,
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

  -- -------------------------------------------------------------------------
  -- Demo clients
  -- -------------------------------------------------------------------------

  insert into public.clients (client_id, user_id, name, contact_info, created_at)
  values
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', demo_user_id, 'Emma Wilson',    null, now()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', demo_user_id, 'Sophie Turner',  null, now()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', demo_user_id, 'James Fletcher', null, now()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004', demo_user_id, 'Priya Patel',    null, now()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005', demo_user_id, 'Marcus Reid',    null, now()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006', demo_user_id, 'Chloe Andrews',  null, now()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0007', demo_user_id, 'Theo Brooks',    null, now()),
    -- Action-signal clients (added to give the demo user visible actions on the Actions tab)
    -- Ravi + Zoe: lapsed_repeat (2+ sessions, last session > 56 days ago)
    -- Finn: new_client (exactly 1 session, > 42 days ago)
    -- Dana: in_progress (2 sessions, most recent in_progress=true, > 28 days ago)
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0008', demo_user_id, 'Ravi Sharma',    null, now()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0009', demo_user_id, 'Zoe Campbell',   null, now()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0010', demo_user_id, 'Finn O''Connor', null, now()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0011', demo_user_id, 'Dana Cross',     null, now());

  -- -------------------------------------------------------------------------
  -- Demo sessions (~40, spread Jan-Apr 2026)
  -- client UUIDs:
  --   0001 Emma Wilson    0002 Sophie Turner  0003 James Fletcher
  --   0004 Priya Patel    0005 Marcus Reid    0006 Chloe Andrews
  --   0007 Theo Brooks
  -- -------------------------------------------------------------------------

  insert into public.sessions (
    session_id,
    user_id,
    client_id,
    price,
    session_at,
    compensation_version_id,
    through_ads
  )
  values
    -- January 2026 (10 sessions)
    ('cccccccc-cccc-cccc-cccc-cccccccc0001', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 12000, '2026-01-05', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0002', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 25000, '2026-01-07', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0003', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', 18000, '2026-01-09', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0004', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004', 30000, '2026-01-13', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0005', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005',  8000, '2026-01-15', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0006', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006', 20000, '2026-01-19', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0007', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0007', 15000, '2026-01-21', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0008', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 35000, '2026-01-23', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0009', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', 22000, '2026-01-27', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0010', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005', 10000, '2026-01-30', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),

    -- February 2026 (10 sessions)
    ('cccccccc-cccc-cccc-cccc-cccccccc0011', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 28000, '2026-02-03', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0012', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004', 14000, '2026-02-05', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0013', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006', 20000, '2026-02-09', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0014', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0007', 32000, '2026-02-11', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0015', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 16000, '2026-02-13', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0016', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003',  9000, '2026-02-17', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0017', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005', 24000, '2026-02-19', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0018', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 18000, '2026-02-23', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0019', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004', 30000, '2026-02-25', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0020', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006', 12000, '2026-02-27', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),

    -- March 2026 (11 sessions)
    ('cccccccc-cccc-cccc-cccc-cccccccc0021', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0007', 20000, '2026-03-02', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0022', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 15000, '2026-03-04', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0023', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', 35000, '2026-03-06', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0024', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005', 18000, '2026-03-10', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0025', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 10000, '2026-03-12', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0026', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004', 26000, '2026-03-16', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0027', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006', 22000, '2026-03-18', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0028', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0007',  8000, '2026-03-20', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0029', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 30000, '2026-03-24', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0030', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', 16000, '2026-03-26', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0031', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005', 20000, '2026-03-28', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),

    -- April 2026 (10 sessions)
    ('cccccccc-cccc-cccc-cccc-cccccccc0032', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 24000, '2026-04-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0033', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004', 12000, '2026-04-03', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0034', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006', 32000, '2026-04-05', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0035', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0007', 18000, '2026-04-07', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0036', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 14000, '2026-04-08', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0037', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', 28000, '2026-04-09', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0038', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005', 10000, '2026-04-10', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0039', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 22000, '2026-04-11', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0040', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004', 16000, '2026-04-12', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0041', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006', 20000, '2026-04-14', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),

    -- May 2026 (10 sessions) — same weekly distribution as April → gross 196,000, paidToStudio 47,000
    -- Week of May  4 (Mon–Sun): gross 68,000 → commission 17,000 (under 25,000 cap)
    -- Week of May 11 (Mon–Sun): gross 108,000 → commission 27,000, capped at 25,000
    -- Week of May 18 (Mon–Sun): gross 20,000 → commission 5,000; total = 47,000
    ('cccccccc-cccc-cccc-cccc-cccccccc0050', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 24000, '2026-05-04', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0051', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004', 12000, '2026-05-06', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0052', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006', 32000, '2026-05-08', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0053', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0007', 18000, '2026-05-11', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0054', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 14000, '2026-05-12', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0055', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', 28000, '2026-05-13', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0056', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005', 10000, '2026-05-14', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0057', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 22000, '2026-05-15', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0058', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004', 16000, '2026-05-16', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0059', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006', 20000, '2026-05-18', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),

    -- November 2026 (10 sessions) — same weekly distribution → gross 196,000, paidToStudio 47,000
    -- Week of Nov  2 (Mon–Sun): gross 68,000 → commission 17,000 (under 25,000 cap)
    -- Week of Nov  9 (Mon–Sun): gross 108,000 → commission 27,000, capped at 25,000
    -- Week of Nov 16 (Mon–Sun): gross 20,000 → commission 5,000; total = 47,000
    ('cccccccc-cccc-cccc-cccc-cccccccc0060', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 24000, '2026-11-02', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0061', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004', 12000, '2026-11-04', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0062', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006', 32000, '2026-11-06', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0063', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0007', 18000, '2026-11-09', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0064', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001', 14000, '2026-11-10', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0065', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003', 28000, '2026-11-11', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0066', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005', 10000, '2026-11-12', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0067', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002', 22000, '2026-11-13', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0068', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0004', 16000, '2026-11-14', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
    ('cccccccc-cccc-cccc-cccc-cccccccc0069', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006', 20000, '2026-11-16', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null);

  -- -------------------------------------------------------------------------
  -- Action-signal sessions (trigger lapsed_repeat, new_client, in_progress)
  -- All in Jan-Mar 2026 so April analytics are unaffected.
  -- Retention impact: 10 of 11 clients have 2+ sessions (91%).
  -- -------------------------------------------------------------------------

  insert into public.sessions (
    session_id,
    user_id,
    client_id,
    price,
    session_at,
    compensation_version_id,
    through_ads,
    in_progress
  )
  values
    -- Ravi Sharma (lapsed_repeat): 2 sessions, last 2026-01-22 (~88 days before 2026-04-20, >= 56-day threshold)
    ('cccccccc-cccc-cccc-cccc-cccccccc0042', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0008', 15000, '2026-01-08', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, false),
    ('cccccccc-cccc-cccc-cccc-cccccccc0043', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0008', 15000, '2026-01-22', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, false),

    -- Zoe Campbell (lapsed_repeat): 3 sessions, last 2026-02-10 (~69 days, >= 56-day threshold)
    ('cccccccc-cccc-cccc-cccc-cccccccc0044', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0009', 20000, '2026-01-10', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, false),
    ('cccccccc-cccc-cccc-cccc-cccccccc0045', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0009', 20000, '2026-01-25', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, false),
    ('cccccccc-cccc-cccc-cccc-cccccccc0046', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0009', 20000, '2026-02-10', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, false),

    -- Finn O'Connor (new_client): exactly 1 session, 2026-02-15 (~64 days, >= 42-day threshold)
    ('cccccccc-cccc-cccc-cccc-cccccccc0047', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0010', 18000, '2026-02-15', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, false),

    -- Dana Cross (in_progress): 2 sessions, most recent in_progress=true, 2026-03-10 (~41 days, >= 28-day threshold)
    -- 41 days < 42-day new_client threshold, so only in_progress fires (not new_client).
    ('cccccccc-cccc-cccc-cccc-cccccccc0048', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0011', 30000, '2026-01-15', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, false),
    ('cccccccc-cccc-cccc-cccc-cccccccc0049', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0011', 30000, '2026-03-10', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, true);

  -- -------------------------------------------------------------------------
  -- Demo expenses (~15, spread Jan-Apr 2026)
  -- -------------------------------------------------------------------------

  insert into public.expenses (
    expense_id,
    user_id,
    item,
    category,
    amount_minor,
    currency_code,
    date_purchased,
    receipt_path,
    receipt_mime_type,
    receipt_size_bytes,
    created_at,
    updated_at
  )
  values
    ('dddddddd-dddd-dddd-dddd-dddddddd0001', demo_user_id, 'Black ink refill',          'ink',             2500, 'GBP', '2026-01-06', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0002', demo_user_id, 'Box of cartridges',         'cartridges',      1800, 'GBP', '2026-01-10', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0003', demo_user_id, 'Needle pack (mixed gauge)', 'needles',         1200, 'GBP', '2026-01-14', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0004', demo_user_id, 'Machine service',           'machines',        8500, 'GBP', '2026-01-20', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0005', demo_user_id, 'Travel to guest spot',      'travel',          4500, 'GBP', '2026-01-28', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0006', demo_user_id, 'White ink bottle',          'ink',             3200, 'GBP', '2026-02-04', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0007', demo_user_id, 'Cartridge refill pack',     'cartridges',      2200, 'GBP', '2026-02-11', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0008', demo_user_id, 'Stencil paper (50 sheets)', 'other_equipment', 1500, 'GBP', '2026-02-18', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0009', demo_user_id, 'Convention travel & hotel', 'travel',         12000, 'GBP', '2026-02-25', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0010', demo_user_id, 'Colour ink set',            'ink',             5600, 'GBP', '2026-03-03', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0011', demo_user_id, 'Needle variety pack',       'needles',         1800, 'GBP', '2026-03-10', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0012', demo_user_id, 'New grip tape roll',        'other_equipment',  900, 'GBP', '2026-03-17', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0013', demo_user_id, 'Rotary machine upgrade',    'machines',       22000, 'GBP', '2026-03-24', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0014', demo_user_id, 'Miscellaneous studio supplies', 'miscellaneous', 3400, 'GBP', '2026-04-02', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0015', demo_user_id, 'Black cartridge pack x50', 'cartridges',       2800, 'GBP', '2026-04-09', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0016', demo_user_id, 'Miscellaneous studio supplies', 'miscellaneous', 3400, 'GBP', '2026-05-05', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0017', demo_user_id, 'Black cartridge pack x50', 'cartridges',       2800, 'GBP', '2026-05-09', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0018', demo_user_id, 'Miscellaneous studio supplies', 'miscellaneous', 3400, 'GBP', '2026-11-05', null, null, null, now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddd0019', demo_user_id, 'Black cartridge pack x50', 'cartridges',       2800, 'GBP', '2026-11-09', null, null, null, now(), now());

  -- -------------------------------------------------------------------------
  -- Timezone test user (Asia/Tokyo, UTC+9) — used for date boundary QA
  -- -------------------------------------------------------------------------

  insert into public.clients (client_id, user_id, name, contact_info, created_at)
  values
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', tz_user_id, 'Hana Sato',   null, now()),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0002', tz_user_id, 'Kenji Tanaka', null, now());

  insert into public.sessions (
    session_id,
    user_id,
    client_id,
    price,
    session_at,
    compensation_version_id
  )
  values
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', tz_user_id, 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', 20000, '2026-04-10', 'bbbbbbbb-0000-0000-0000-000000000001'),
    ('ffffffff-ffff-ffff-ffff-fffffffffffe', tz_user_id, 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0002', 15000, '2026-03-28', 'bbbbbbbb-0000-0000-0000-000000000001');

  -- -------------------------------------------------------------------------
  -- LA timezone user (America/Los_Angeles, UTC-8) — behind-UTC timezone QA
  -- -------------------------------------------------------------------------

  insert into public.clients (client_id, user_id, name, contact_info, created_at)
  values
    ('55550000-0000-0000-0000-000000000001', la_user_id, 'Kai Nguyen',     null, now()),
    ('55550000-0000-0000-0000-000000000002', la_user_id, 'Maya Rodriguez', null, now()),
    ('55550000-0000-0000-0000-000000000003', la_user_id, 'Jake Torres',    null, now()),
    ('55550000-0000-0000-0000-000000000004', la_user_id, 'Lily Park',      null, now()),
    ('55550000-0000-0000-0000-000000000005', la_user_id, 'Dex Williams',   null, now());

  insert into public.sessions (
    session_id,
    user_id,
    client_id,
    price,
    session_at,
    compensation_version_id,
    through_ads
  )
  values
    -- January 2026 (4 sessions)
    ('55550001-0000-0000-0000-000000000001', la_user_id, '55550000-0000-0000-0000-000000000001', 18000, '2026-01-08', '55555555-5555-5555-5555-000000000001', null),
    ('55550001-0000-0000-0000-000000000002', la_user_id, '55550000-0000-0000-0000-000000000002', 25000, '2026-01-14', '55555555-5555-5555-5555-000000000001', null),
    ('55550001-0000-0000-0000-000000000003', la_user_id, '55550000-0000-0000-0000-000000000003', 15000, '2026-01-20', '55555555-5555-5555-5555-000000000001', null),
    ('55550001-0000-0000-0000-000000000004', la_user_id, '55550000-0000-0000-0000-000000000004', 20000, '2026-01-27', '55555555-5555-5555-5555-000000000001', null),
    -- February 2026 (4 sessions)
    ('55550001-0000-0000-0000-000000000005', la_user_id, '55550000-0000-0000-0000-000000000005', 12000, '2026-02-04', '55555555-5555-5555-5555-000000000001', null),
    ('55550001-0000-0000-0000-000000000006', la_user_id, '55550000-0000-0000-0000-000000000001', 20000, '2026-02-11', '55555555-5555-5555-5555-000000000001', null),
    ('55550001-0000-0000-0000-000000000007', la_user_id, '55550000-0000-0000-0000-000000000002', 30000, '2026-02-18', '55555555-5555-5555-5555-000000000001', true),
    ('55550001-0000-0000-0000-000000000008', la_user_id, '55550000-0000-0000-0000-000000000003', 17500, '2026-02-25', '55555555-5555-5555-5555-000000000001', null),
    -- March 2026 (4 sessions)
    ('55550001-0000-0000-0000-000000000009', la_user_id, '55550000-0000-0000-0000-000000000004', 22000, '2026-03-04', '55555555-5555-5555-5555-000000000001', null),
    ('55550001-0000-0000-0000-000000000010', la_user_id, '55550000-0000-0000-0000-000000000005', 14000, '2026-03-11', '55555555-5555-5555-5555-000000000001', null),
    ('55550001-0000-0000-0000-000000000011', la_user_id, '55550000-0000-0000-0000-000000000001', 18000, '2026-03-18', '55555555-5555-5555-5555-000000000001', null),
    ('55550001-0000-0000-0000-000000000012', la_user_id, '55550000-0000-0000-0000-000000000002', 26000, '2026-03-25', '55555555-5555-5555-5555-000000000001', null),
    -- April 2026 (4 sessions)
    ('55550001-0000-0000-0000-000000000013', la_user_id, '55550000-0000-0000-0000-000000000003', 16000, '2026-04-03', '55555555-5555-5555-5555-000000000001', null),
    ('55550001-0000-0000-0000-000000000014', la_user_id, '55550000-0000-0000-0000-000000000004', 24000, '2026-04-09', '55555555-5555-5555-5555-000000000001', null),
    ('55550001-0000-0000-0000-000000000015', la_user_id, '55550000-0000-0000-0000-000000000005', 13000, '2026-04-16', '55555555-5555-5555-5555-000000000001', null),
    ('55550001-0000-0000-0000-000000000016', la_user_id, '55550000-0000-0000-0000-000000000001', 19000, '2026-04-23', '55555555-5555-5555-5555-000000000001', null);

  insert into public.expenses (
    expense_id,
    user_id,
    item,
    category,
    amount_minor,
    currency_code,
    date_purchased,
    receipt_path,
    receipt_mime_type,
    receipt_size_bytes,
    created_at,
    updated_at
  )
  values
    ('55550002-0000-0000-0000-000000000001', la_user_id, 'Black ink refill',          'ink',             2800, 'USD', '2026-01-09', null, null, null, now(), now()),
    ('55550002-0000-0000-0000-000000000002', la_user_id, 'Needle pack (mixed gauge)', 'needles',         1500, 'USD', '2026-01-22', null, null, null, now(), now()),
    ('55550002-0000-0000-0000-000000000003', la_user_id, 'Convention travel',         'travel',          9500, 'USD', '2026-02-06', null, null, null, now(), now()),
    ('55550002-0000-0000-0000-000000000004', la_user_id, 'Rotary machine service',    'machines',        6500, 'USD', '2026-02-20', null, null, null, now(), now()),
    ('55550002-0000-0000-0000-000000000005', la_user_id, 'Colour ink set',            'ink',             4800, 'USD', '2026-03-05', null, null, null, now(), now()),
    ('55550002-0000-0000-0000-000000000006', la_user_id, 'Cartridge refill pack',     'cartridges',      2200, 'USD', '2026-03-19', null, null, null, now(), now()),
    ('55550002-0000-0000-0000-000000000007', la_user_id, 'Stencil paper (50 sheets)', 'other_equipment', 1200, 'USD', '2026-04-05', null, null, null, now(), now()),
    ('55550002-0000-0000-0000-000000000008', la_user_id, 'Studio supplies misc',      'miscellaneous',   3100, 'USD', '2026-04-18', null, null, null, now(), now());

  -- -------------------------------------------------------------------------
  -- Retention thin user (2 sessions, 2 clients) — message shows
  -- totalSessions=2 < 4 OR denominator=2 < 3 → both conditions true
  -- -------------------------------------------------------------------------

  insert into public.clients (client_id, user_id, name, contact_info, created_at)
  values
    ('66660000-0000-0000-0000-000000000001', retention_thin_id, 'Alex Kim',    null, now()),
    ('66660000-0000-0000-0000-000000000002', retention_thin_id, 'Sam Torres',  null, now());

  insert into public.sessions (
    session_id,
    user_id,
    client_id,
    price,
    session_at,
    compensation_version_id
  )
  values
    ('66660001-0000-0000-0000-000000000001', retention_thin_id, '66660000-0000-0000-0000-000000000001', 15000, '2026-03-10', '66666666-6666-6666-6666-000000000001'),
    ('66660001-0000-0000-0000-000000000002', retention_thin_id, '66660000-0000-0000-0000-000000000002', 12000, '2026-04-02', '66666666-6666-6666-6666-000000000001');

  -- -------------------------------------------------------------------------
  -- Retention boundary user (4 sessions, 3 clients, 1 returning) — real rate shows
  -- totalSessions=4, denominator=3 → neither threshold fires
  -- Client A: 2 sessions → returning. B, C: 1 session each → not returning.
  -- Rate: 1 of 3 = 33%
  -- -------------------------------------------------------------------------

  insert into public.clients (client_id, user_id, name, contact_info, created_at)
  values
    ('77770000-0000-0000-0000-000000000001', retention_boundary_id, 'Jordan Lee',   null, now()),
    ('77770000-0000-0000-0000-000000000002', retention_boundary_id, 'Casey Morgan', null, now()),
    ('77770000-0000-0000-0000-000000000003', retention_boundary_id, 'Riley Quinn',  null, now());

  insert into public.sessions (
    session_id,
    user_id,
    client_id,
    price,
    session_at,
    compensation_version_id
  )
  values
    -- Jordan Lee: 2 sessions → returning client
    ('77770001-0000-0000-0000-000000000001', retention_boundary_id, '77770000-0000-0000-0000-000000000001', 20000, '2026-02-10', '77777777-7777-7777-7777-000000000001'),
    ('77770001-0000-0000-0000-000000000002', retention_boundary_id, '77770000-0000-0000-0000-000000000001', 18000, '2026-03-15', '77777777-7777-7777-7777-000000000001'),
    -- Casey Morgan: 1 session
    ('77770001-0000-0000-0000-000000000003', retention_boundary_id, '77770000-0000-0000-0000-000000000002', 25000, '2026-03-20', '77777777-7777-7777-7777-000000000001'),
    -- Riley Quinn: 1 session
    ('77770001-0000-0000-0000-000000000004', retention_boundary_id, '77770000-0000-0000-0000-000000000003', 15000, '2026-04-05', '77777777-7777-7777-7777-000000000001');

end $$;
