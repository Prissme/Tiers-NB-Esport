alter table if exists public.lfn_player_profiles
  add column if not exists description text;
