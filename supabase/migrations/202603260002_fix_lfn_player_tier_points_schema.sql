alter table public.lfn_player_tier_points
  add column if not exists tier text not null default 'Tier E' check (tier in ('Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E')),
  add column if not exists season_id uuid references public.lfn_seasons(id) on delete cascade;

do $$
declare
  fallback_season uuid;
begin
  select id
    into fallback_season
  from public.lfn_seasons
  where status = 'active'
  order by created_at desc
  limit 1;

  if fallback_season is null then
    select id
      into fallback_season
    from public.lfn_seasons
    order by created_at desc
    limit 1;
  end if;

  if fallback_season is not null then
    update public.lfn_player_tier_points
    set season_id = fallback_season
    where season_id is null;
  end if;
end $$;

alter table public.lfn_player_tier_points
  drop constraint if exists lfn_player_tier_points_pkey;

alter table public.lfn_player_tier_points
  add constraint lfn_player_tier_points_pkey primary key (player_id, season_id);

create index if not exists lfn_player_tier_points_season_idx
  on public.lfn_player_tier_points (season_id);
