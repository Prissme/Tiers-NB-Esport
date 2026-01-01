create extension if not exists "pgcrypto";

create table if not exists public.lfn_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null unique,
  division text not null,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lfn_matches (
  id uuid primary key default gen_random_uuid(),
  scheduled_at timestamptz not null,
  division text not null,
  team_a_id uuid not null references public.lfn_teams(id) on delete cascade,
  team_b_id uuid not null references public.lfn_teams(id) on delete cascade,
  score_a integer,
  score_b integer,
  best_of integer,
  status text not null default 'completed',
  day_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lfn_matches_scheduled_at_idx on public.lfn_matches (scheduled_at desc);
create index if not exists lfn_matches_team_a_idx on public.lfn_matches (team_a_id);
create index if not exists lfn_matches_team_b_idx on public.lfn_matches (team_b_id);

create table if not exists public.admin_points_adjustments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.lfn_teams(id) on delete cascade,
  points integer not null,
  reason text,
  applied_at timestamptz not null default now(),
  season_id uuid,
  match_id uuid
);

create index if not exists admin_points_adjustments_team_idx on public.admin_points_adjustments (team_id);

create or replace view public.lfn_standings as
with match_rows as (
  select
    matches.team_a_id as team_id,
    matches.division as division,
    matches.score_a as sets_won,
    matches.score_b as sets_lost,
    case when matches.score_a > matches.score_b then 1 else 0 end as win,
    case when matches.score_a < matches.score_b then 1 else 0 end as loss
  from public.lfn_matches as matches
  where matches.score_a is not null and matches.score_b is not null
  union all
  select
    matches.team_b_id as team_id,
    matches.division as division,
    matches.score_b as sets_won,
    matches.score_a as sets_lost,
    case when matches.score_b > matches.score_a then 1 else 0 end as win,
    case when matches.score_b < matches.score_a then 1 else 0 end as loss
  from public.lfn_matches as matches
  where matches.score_a is not null and matches.score_b is not null
),
match_totals as (
  select
    team_id,
    division,
    sum(sets_won) as sets_won,
    sum(sets_lost) as sets_lost,
    sum(win) as wins,
    sum(loss) as losses
  from match_rows
  group by team_id, division
),
admin_totals as (
  select
    team_id,
    sum(points) as points_admin
  from public.admin_points_adjustments
  group by team_id
)
select
  teams.id as team_id,
  teams.name as team_name,
  teams.tag as team_tag,
  teams.division as division,
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
