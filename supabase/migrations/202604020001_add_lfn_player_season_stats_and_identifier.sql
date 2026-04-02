alter table public.lfn_seasons
  add column if not exists identifier text;

do $$
declare
  rec record;
  candidate text;
  idx integer;
begin
  for rec in select id, coalesce(name, 'season') as name from public.lfn_seasons where identifier is null loop
    candidate := lower(regexp_replace(rec.name, '[^a-zA-Z0-9]+', '-', 'g'));
    candidate := trim(both '-' from candidate);
    if candidate = '' then
      candidate := 'season';
    end if;

    idx := 1;
    while exists (select 1 from public.lfn_seasons s where s.identifier = candidate and s.id <> rec.id) loop
      idx := idx + 1;
      candidate := lower(regexp_replace(rec.name, '[^a-zA-Z0-9]+', '-', 'g'));
      candidate := trim(both '-' from candidate) || '-' || idx::text;
    end loop;

    update public.lfn_seasons
    set identifier = candidate
    where id = rec.id;
  end loop;
end $$;

alter table public.lfn_seasons
  alter column identifier set not null;

create unique index if not exists lfn_seasons_identifier_key
  on public.lfn_seasons(identifier);

create table if not exists public.lfn_player_season_stats (
  season_id uuid not null references public.lfn_seasons(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  points integer not null default 0,
  tier text not null default 'Tier E' check (tier in ('Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E')),
  wins integer not null default 0,
  losses integer not null default 0,
  games_played integer not null default 0,
  solo_elo integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (season_id, player_id)
);

create index if not exists lfn_player_season_stats_player_idx
  on public.lfn_player_season_stats(player_id);

create index if not exists lfn_player_season_stats_points_idx
  on public.lfn_player_season_stats(season_id, points desc);
