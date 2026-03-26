create table if not exists public.lfn_player_profiles (
  player_id uuid primary key references public.players(id) on delete cascade,
  country_code text not null default 'FR' check (char_length(country_code) = 2),
  updated_at timestamptz not null default now()
);

create index if not exists lfn_player_profiles_country_code_idx
  on public.lfn_player_profiles (country_code);
