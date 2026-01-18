insert into public.lfn_seasons (id, name, starts_at, ends_at, status)
select gen_random_uuid(), 'LFN Current', null, null, 'active'
where not exists (select 1 from public.lfn_seasons);

with current_season as (
  select id from public.lfn_seasons
  where status = 'active'
  order by starts_at nulls last, created_at asc
  limit 1
)
update public.lfn_teams
set season_id = (select id from current_season)
where season_id is null;

with current_season as (
  select id from public.lfn_seasons
  where status = 'active'
  order by starts_at nulls last, created_at asc
  limit 1
)
update public.lfn_team_members
set season_id = (select id from current_season)
where season_id is null;

with current_season as (
  select id from public.lfn_seasons
  where status = 'active'
  order by starts_at nulls last, created_at asc
  limit 1
)
update public.lfn_matches
set season_id = (select id from current_season)
where season_id is null;

update public.lfn_matches
set scheduled_at = case
  when scheduled_at is null and day ~ '^\d{4}-\d{2}-\d{2}$' and start_time is not null
    then (day || 'T' || start_time || ':00')::timestamptz
  when scheduled_at is null and day ~ '^\d{4}-\d{2}-\d{2}T'
    then day::timestamptz
  else scheduled_at
end
where scheduled_at is null;

update public.lfn_matches
set phase = 'regular'
where phase is null;

update public.lfn_teams set is_active = true where is_active is null;
update public.lfn_team_members set is_active = true where is_active is null;
