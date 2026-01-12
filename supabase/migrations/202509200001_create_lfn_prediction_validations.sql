create table if not exists public.lfn_prediction_validations (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  validated_at timestamptz not null default now(),
  unique (guild_id, user_id)
);

create index if not exists lfn_prediction_validations_guild_idx on public.lfn_prediction_validations (guild_id);
create index if not exists lfn_prediction_validations_user_idx on public.lfn_prediction_validations (user_id);
