create table if not exists public.lfn_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.lfn_teams(id) on delete cascade,
  role text not null check (role in ('starter', 'sub', 'coach')),
  slot integer,
  player_name text not null,
  mains text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lfn_team_members_team_id_idx on public.lfn_team_members (team_id);
