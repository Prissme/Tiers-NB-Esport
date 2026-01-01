alter table if exists public.lfn_teams
  add column if not exists stats_summary text,
  add column if not exists main_brawlers text;
