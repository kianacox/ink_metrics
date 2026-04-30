-- Adds an RPC for updating a user's display name immediately, without rolling
-- the active artist_compensation_versions row over. Used by PUT /api/profile
-- when only the display name changed; chair rent / reporting timezone changes
-- continue to use rollover_profile_compensation_version.

CREATE OR REPLACE FUNCTION public.update_profile_display_name(
  p_display_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to edit your profile.';
  END IF;

  IF p_display_name IS NULL OR length(btrim(p_display_name)) < 2 THEN
    RAISE EXCEPTION 'Name must be at least 2 characters.';
  END IF;

  UPDATE public.profiles
  SET display_name = p_display_name
  WHERE user_id = current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile row is missing.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_profile_display_name(text) FROM public;

GRANT EXECUTE ON FUNCTION public.update_profile_display_name(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_profile_display_name(text) TO service_role;
