alter table if exists public.lfn_player_profiles
  add column if not exists team_id uuid references public.lfn_teams(id) on delete set null;

create index if not exists lfn_player_profiles_team_id_idx
  on public.lfn_player_profiles (team_id);
