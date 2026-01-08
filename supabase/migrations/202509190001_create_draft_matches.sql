create table if not exists public.draft_matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  guild_id text not null,
  channel_id text not null,
  user_id text not null,
  meta_profile text not null default 'BUFFIES',
  user_bans text[] not null default '{}',
  ai_bans text[] not null default '{}',
  user_picks text[] not null default '{}',
  ai_picks text[] not null default '{}',
  user_score numeric not null,
  ai_score numeric not null,
  winner text not null check (winner in ('user', 'ai', 'draw'))
);

create index if not exists draft_matches_created_at_idx on public.draft_matches (created_at desc);
create index if not exists draft_matches_user_id_idx on public.draft_matches (user_id);
