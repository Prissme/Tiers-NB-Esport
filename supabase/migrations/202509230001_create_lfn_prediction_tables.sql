create extension if not exists "pgcrypto";

create table if not exists public.lfn_predictions (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  message_id text not null,
  channel_id text not null,
  match_number integer not null,
  team1_name text not null,
  team2_name text not null,
  match_date text,
  created_at timestamptz not null default now()
);

create unique index if not exists lfn_predictions_message_id_key on public.lfn_predictions (message_id);
create index if not exists lfn_predictions_guild_idx on public.lfn_predictions (guild_id);
create index if not exists lfn_predictions_match_idx on public.lfn_predictions (guild_id, match_number);

create table if not exists public.lfn_prediction_votes (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.lfn_predictions(id) on delete cascade,
  user_id text not null,
  voted_team text not null,
  voted_at timestamptz not null default now(),
  unique (prediction_id, user_id)
);

create index if not exists lfn_prediction_votes_prediction_idx on public.lfn_prediction_votes (prediction_id);
create index if not exists lfn_prediction_votes_user_idx on public.lfn_prediction_votes (user_id);

create table if not exists public.lfn_prediction_validations (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  validated_at timestamptz not null default now(),
  unique (guild_id, user_id)
);

create index if not exists lfn_prediction_validations_guild_idx on public.lfn_prediction_validations (guild_id);
create index if not exists lfn_prediction_validations_user_idx on public.lfn_prediction_validations (user_id);

alter table public.lfn_predictions disable row level security;
alter table public.lfn_prediction_votes disable row level security;
alter table public.lfn_prediction_validations disable row level security;
