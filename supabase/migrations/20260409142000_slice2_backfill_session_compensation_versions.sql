update public.sessions as session_rows
set compensation_version_id = (
  select version_rows.compensation_version_id
  from public.artist_compensation_versions as version_rows
  where version_rows.user_id = session_rows.user_id
    and version_rows.effective_from <= session_rows.session_at
    and (
      version_rows.effective_to is null
      or session_rows.session_at < version_rows.effective_to
    )
  order by version_rows.effective_from desc
  limit 1
)
where session_rows.compensation_version_id is null;
