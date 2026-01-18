create extension if not exists "pgcrypto";

create table if not exists public.lfn_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'upcoming' check (status in ('upcoming','active','completed')),
  created_at timestamptz not null default now()
);

alter table public.lfn_teams
  add column if not exists season_id uuid references public.lfn_seasons(id) on delete set null,
  add column if not exists is_active boolean not null default true;

alter table public.lfn_team_members
  add column if not exists season_id uuid references public.lfn_seasons(id) on delete set null,
  add column if not exists is_active boolean not null default true;

alter table public.lfn_matches
  add column if not exists season_id uuid references public.lfn_seasons(id) on delete set null,
  add column if not exists phase text default 'regular',
  add column if not exists round text,
  add column if not exists match_group text,
  add column if not exists best_of integer,
  add column if not exists scheduled_at timestamptz;

create index if not exists lfn_teams_season_idx on public.lfn_teams (season_id);
create index if not exists lfn_team_members_season_idx on public.lfn_team_members (season_id);
create index if not exists lfn_matches_season_idx on public.lfn_matches (season_id);
create index if not exists lfn_matches_phase_idx on public.lfn_matches (phase);
create index if not exists lfn_matches_scheduled_at_idx on public.lfn_matches (scheduled_at);

create table if not exists public.lfn_assets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.lfn_teams(id) on delete cascade,
  asset_type text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lfn_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.lfn_seasons(id) on delete set null,
  label text not null,
  match_group text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.lfn_prediction_validations (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  validated_at timestamptz not null default now(),
  unique (guild_id, user_id)
);

create unique index if not exists lfn_prediction_validations_guild_user_key
  on public.lfn_prediction_validations (guild_id, user_id);

create or replace view public.lfn_standings as
with match_rows as (
  select
    matches.team_a_id as team_id,
    matches.division as division,
    matches.season_id as season_id,
    matches.score_a as sets_won,
    matches.score_b as sets_lost,
    case when matches.score_a > matches.score_b then 1 else 0 end as win,
    case when matches.score_a < matches.score_b then 1 else 0 end as loss
  from public.lfn_matches as matches
  where matches.score_a is not null
    and matches.score_b is not null
    and (matches.phase is null or matches.phase = 'regular')
  union all
  select
    matches.team_b_id as team_id,
    matches.division as division,
    matches.season_id as season_id,
    matches.score_b as sets_won,
    matches.score_a as sets_lost,
    case when matches.score_b > matches.score_a then 1 else 0 end as win,
    case when matches.score_b < matches.score_a then 1 else 0 end as loss
  from public.lfn_matches as matches
  where matches.score_a is not null
    and matches.score_b is not null
    and (matches.phase is null or matches.phase = 'regular')
),
match_totals as (
  select
    team_id,
    division,
    season_id,
    sum(sets_won) as sets_won,
    sum(sets_lost) as sets_lost,
    sum(win) as wins,
    sum(loss) as losses
  from match_rows
  group by team_id, division, season_id
),
admin_totals as (
  select
    team_id,
    season_id,
    sum(points) as points_admin
  from public.admin_points_adjustments
  group by team_id, season_id
)
select
  teams.id as team_id,
  teams.name as team_name,
  teams.tag as team_tag,
  teams.division as division,
  coalesce(match_totals.season_id, teams.season_id, admin_totals.season_id) as season_id,
  coalesce(match_totals.wins, 0) as wins,
  coalesce(match_totals.losses, 0) as losses,
  coalesce(match_totals.sets_won, 0) as sets_won,
  coalesce(match_totals.sets_lost, 0) as sets_lost,
  coalesce(match_totals.sets_won, 0) as points_sets,
  coalesce(admin_totals.points_admin, 0) as points_admin,
  coalesce(match_totals.sets_won, 0) + coalesce(admin_totals.points_admin, 0) as points_total
from public.lfn_teams as teams
left join match_totals on match_totals.team_id = teams.id
left join admin_totals on admin_totals.team_id = teams.id;
