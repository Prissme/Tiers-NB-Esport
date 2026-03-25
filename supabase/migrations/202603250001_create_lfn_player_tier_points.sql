create table if not exists public.lfn_player_tier_points (
  player_id uuid primary key references public.players(id) on delete cascade,
  points integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists lfn_player_tier_points_points_idx
  on public.lfn_player_tier_points (points desc);
