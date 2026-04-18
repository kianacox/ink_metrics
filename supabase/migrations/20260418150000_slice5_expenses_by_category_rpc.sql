-- Slice 5 PR 6: Expenses by category rollup for dashboard analytics.
-- Returns one row per category that has expenses in the given local date window.
-- Caller merges with the full category list to fill zeros.

create or replace function public.compute_expenses_by_category(
  p_user_id uuid,
  p_month_start_local_date date,
  p_month_end_local_date date
)
returns table (
  category text,
  total_minor bigint
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

  if p_month_start_local_date is null or p_month_end_local_date is null then
    raise exception 'Month date boundaries are required.';
  end if;

  return query
    select
      e.category,
      sum(e.amount_minor)::bigint as total_minor
    from public.expenses e
    where
      e.user_id = p_user_id
      and e.date_purchased >= p_month_start_local_date
      and e.date_purchased < p_month_end_local_date
    group by e.category;
end;
$$;

grant execute on function public.compute_expenses_by_category(uuid, date, date) to authenticated;

-- Support category rollup queries efficiently.
-- Spec section 7.2 calls for this index; verify it does not already exist first.
create index if not exists expenses_user_category_date_idx
  on public.expenses (user_id, category, date_purchased desc);
