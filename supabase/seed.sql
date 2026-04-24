-- Deterministic E2E users for local Playwright runs.
-- Password for both users: Password123!
-- Password for demo user: Password123

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  session_user_id uuid := '11111111-1111-1111-1111-111111111111';
  incomplete_user_id uuid := '22222222-2222-2222-2222-222222222222';
  demo_user_id uuid := '33333333-3333-3333-3333-333333333333';
  session_user_email text := 'seeded-session-user@example.com';
  incomplete_user_email text := 'seeded-incomplete-user@example.com';
  demo_user_email text := 'test@test.com';
begin
  -- -------------------------------------------------------------------------
  -- Cleanup (order matters: child tables first)
  -- -------------------------------------------------------------------------

  delete from public.expenses
  where user_id in (demo_user_id);

  delete from public.sessions
  where user_id in (demo_user_id);

  delete from public.clients
  where user_id in (demo_user_id);

  delete from public.artist_compensation_versions
  where user_id in (session_user_id, incomplete_user_id, demo_user_id);

  delete from public.profiles
  where user_id in (session_user_id, incomplete_user_id, demo_user_id);

  delete from auth.identities
  where user_id in (session_user_id, incomplete_user_id, demo_user_id);

  delete from auth.users
  where id in (session_user_id, incomplete_user_id, demo_user_id);

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
    (demo_user_id, 'Demo Artist', 'GBP', 'Europe/London', 1, true, now(), now());

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
    ('cccccccc-cccc-cccc-cccc-cccccccc0041', demo_user_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0006', 20000, '2026-04-14', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null);

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
    ('dddddddd-dddd-dddd-dddd-dddddddd0015', demo_user_id, 'Black cartridge pack x50', 'cartridges',       2800, 'GBP', '2026-04-09', null, null, null, now(), now());

end $$;
