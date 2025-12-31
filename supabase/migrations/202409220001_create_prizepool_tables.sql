create extension if not exists "pgcrypto";

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  prize_goal numeric(10, 2) not null default 0,
  current_amount numeric(10, 2) not null default 0,
  status text not null default 'En cours',
  created_at timestamptz not null default now()
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id text,
  amount numeric(10, 2) not null,
  anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contributions_tournament_id_idx on public.contributions(tournament_id);
