-- Extend compute_dashboard_take_home_summary to also return session_count.
-- DROP + CREATE required because Postgres disallows changing a function's return type via CREATE OR REPLACE.

drop function if exists public.compute_dashboard_take_home_summary(
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  text,
  date,
  date
);

create function public.compute_dashboard_take_home_summary(
  p_user_id uuid,
  p_month_start_utc timestamp with time zone,
  p_month_end_utc timestamp with time zone,
  p_reporting_timezone text,
  p_month_start_local_date date,
  p_month_end_local_date date
)
returns table (
  gross_minor bigint,
  paid_to_studio_minor bigint,
  total_expenses_minor bigint,
  net_minor bigint,
  session_count bigint
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

  if p_reporting_timezone is null or btrim(p_reporting_timezone) = '' then
    raise exception 'A reporting timezone is required.';
  end if;

  if p_month_start_utc is null
     or p_month_end_utc is null
     or p_month_end_utc <= p_month_start_utc then
    raise exception 'Invalid month window.';
  end if;

  if p_month_start_local_date is null
     or p_month_end_local_date is null
     or p_month_end_local_date <= p_month_start_local_date then
    raise exception 'Invalid local month window.';
  end if;

  return query
  with resolved_sessions as (
    select
      coalesce(s.price, 0)::bigint as price_minor,
      timezone(p_reporting_timezone, s.session_at) as local_session_at,
      coalesce(version_by_id.pay_chair_rent, version_fallback.pay_chair_rent, false) as pay_chair_rent,
      coalesce(version_by_id.rent_type, version_fallback.rent_type) as rent_type,
      coalesce(version_by_id.fixed_frequency, version_fallback.fixed_frequency) as fixed_frequency,
      coalesce(version_by_id.fixed_amount_minor, version_fallback.fixed_amount_minor) as fixed_amount_minor,
      coalesce(version_by_id.commission_rate_bps, version_fallback.commission_rate_bps) as commission_rate_bps,
      coalesce(version_by_id.commission_capped, version_fallback.commission_capped, false) as commission_capped,
      coalesce(version_by_id.commission_cap_frequency, version_fallback.commission_cap_frequency) as commission_cap_frequency,
      coalesce(version_by_id.commission_cap_amount_minor, version_fallback.commission_cap_amount_minor) as commission_cap_amount_minor,
      coalesce(
        version_by_id.compensation_version_id,
        version_fallback.compensation_version_id
      ) as resolved_compensation_version_id
    from public.sessions as s
    left join public.artist_compensation_versions as version_by_id
      on version_by_id.compensation_version_id = s.compensation_version_id
    left join lateral (
      select
        version_rows.compensation_version_id,
        version_rows.pay_chair_rent,
        version_rows.rent_type,
        version_rows.fixed_frequency,
        version_rows.fixed_amount_minor,
        version_rows.commission_rate_bps,
        version_rows.commission_capped,
        version_rows.commission_cap_frequency,
        version_rows.commission_cap_amount_minor
      from public.artist_compensation_versions as version_rows
      where s.compensation_version_id is null
        and version_rows.user_id = s.user_id
        and version_rows.effective_from <= s.session_at
        and (
          version_rows.effective_to is null
          or s.session_at < version_rows.effective_to
        )
      order by version_rows.effective_from desc
      limit 1
    ) as version_fallback on true
    where s.user_id = p_user_id
      and s.session_at >= p_month_start_utc
      and s.session_at < p_month_end_utc
  ),
  session_count_total as (
    select count(*)::bigint as session_count
    from resolved_sessions
  ),
  gross_total as (
    select coalesce(sum(price_minor), 0)::bigint as gross_minor
    from resolved_sessions
  ),
  commission_buckets as (
    select
      resolved_compensation_version_id as compensation_bucket_id,
      case
        when commission_capped and commission_cap_frequency = 'weekly'
          then date_trunc('week', local_session_at)::date
        else date_trunc('month', local_session_at)::date
      end as period_bucket_start,
      commission_rate_bps,
      commission_capped,
      commission_cap_amount_minor,
      sum(price_minor)::bigint as period_gross_minor
    from resolved_sessions
    where pay_chair_rent
      and rent_type = 'commission'
      and commission_rate_bps is not null
    group by
      compensation_bucket_id,
      period_bucket_start,
      commission_rate_bps,
      commission_capped,
      commission_cap_amount_minor
  ),
  commission_deductions as (
    select coalesce(
      sum(
        case
          when commission_capped
            then least(
              floor((period_gross_minor::numeric * commission_rate_bps::numeric) / 10000)::bigint,
              coalesce(commission_cap_amount_minor, 0)
            )
          else floor((period_gross_minor::numeric * commission_rate_bps::numeric) / 10000)::bigint
        end
      ),
      0
    )::bigint as paid_minor
    from commission_buckets
  ),
  fixed_buckets as (
    select distinct
      resolved_compensation_version_id as compensation_bucket_id,
      case
        when fixed_frequency = 'weekly'
          then date_trunc('week', local_session_at)::date
        else date_trunc('month', local_session_at)::date
      end as period_bucket_start,
      fixed_amount_minor
    from resolved_sessions
    where pay_chair_rent
      and rent_type = 'fixed'
      and fixed_frequency in ('weekly', 'monthly')
      and fixed_amount_minor is not null
  ),
  fixed_deductions as (
    select coalesce(sum(fixed_amount_minor), 0)::bigint as paid_minor
    from fixed_buckets
  ),
  paid_to_studio_total as (
    select
      (coalesce((select paid_minor from commission_deductions), 0)
      + coalesce((select paid_minor from fixed_deductions), 0))::bigint as paid_to_studio_minor
  ),
  expense_total as (
    select
      coalesce(sum(e.amount_minor), 0)::bigint as total_expenses_minor
    from public.expenses as e
    where e.user_id = p_user_id
      and e.date_purchased >= p_month_start_local_date
      and e.date_purchased < p_month_end_local_date
  )
  select
    gross_total.gross_minor,
    paid_to_studio_total.paid_to_studio_minor,
    expense_total.total_expenses_minor,
    (
      gross_total.gross_minor
      - paid_to_studio_total.paid_to_studio_minor
      - expense_total.total_expenses_minor
    )::bigint as net_minor,
    session_count_total.session_count
  from gross_total
  cross join paid_to_studio_total
  cross join expense_total
  cross join session_count_total;
end;
$$;

revoke all on function public.compute_dashboard_take_home_summary(
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  text,
  date,
  date
) from public;

grant execute on function public.compute_dashboard_take_home_summary(
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  text,
  date,
  date
) to authenticated;

grant execute on function public.compute_dashboard_take_home_summary(
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  text,
  date,
  date
) to service_role;
