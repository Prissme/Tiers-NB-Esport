create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop view if exists public.lfn_standings;
drop table if exists public.lfn_matches;

create table public.lfn_matches (
  id uuid primary key default gen_random_uuid(),
  day text not null,
  division text not null check (division in ('D1','D2')),
  start_time text not null,
  team_a_id uuid not null references public.lfn_teams(id) on delete restrict,
  team_b_id uuid not null references public.lfn_teams(id) on delete restrict,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished')),
  score_a int null,
  score_b int null,
  notes text null,
  vod_url text null,
  proof_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lfn_matches_day_division_status_idx
  on public.lfn_matches (day, division, status);

create trigger set_lfn_matches_updated_at
before update on public.lfn_matches
for each row
execute function public.set_updated_at();

alter table public.lfn_matches disable row level security;

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
