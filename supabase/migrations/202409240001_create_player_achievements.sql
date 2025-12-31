create extension if not exists "pgcrypto";

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  icon_url text,
  category text not null,
  condition jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists player_achievements (
  player_id uuid not null references players(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (player_id, achievement_id)
);

create index if not exists player_achievements_player_idx on player_achievements (player_id);

create table if not exists player_mmr_history (
  id bigserial primary key,
  player_id uuid not null references players(id) on delete cascade,
  mmr integer not null,
  recorded_at timestamptz not null default now()
);

create index if not exists player_mmr_history_player_idx on player_mmr_history (player_id, recorded_at desc);

create or replace function record_player_mmr_history()
returns trigger as $$
begin
  if new.mmr is distinct from old.mmr then
    insert into player_mmr_history (player_id, mmr, recorded_at)
    values (new.id, new.mmr, now());
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function check_player_achievements_on_player_update()
returns trigger as $$
begin
  insert into player_achievements (player_id, achievement_id, unlocked_at)
  select new.id,
         achievements.id,
         now()
  from achievements
  where (
    (achievements.condition->>'type' = 'wins' and coalesce(new.wins, 0) >= (achievements.condition->>'threshold')::int)
    or (achievements.condition->>'type' = 'losses' and coalesce(new.losses, 0) >= (achievements.condition->>'threshold')::int)
    or (achievements.condition->>'type' = 'win_streak' and coalesce(new.win_streak, 0) >= (achievements.condition->>'threshold')::int)
    or (achievements.condition->>'type' = 'games_played' and coalesce(new.games_played, coalesce(new.wins, 0) + coalesce(new.losses, 0)) >= (achievements.condition->>'threshold')::int)
    or (achievements.condition->>'type' = 'mmr' and coalesce(new.mmr, 0) >= (achievements.condition->>'threshold')::int)
    or (achievements.condition->>'type' = 'solo_elo' and coalesce(new.solo_elo, 0) >= (achievements.condition->>'threshold')::int)
  )
  on conflict do nothing;
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'player_mmr_history_trigger'
  ) then
    create trigger player_mmr_history_trigger
    after update of mmr on players
    for each row
    execute function record_player_mmr_history();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'player_achievements_trigger'
  ) then
    create trigger player_achievements_trigger
    after insert or update of wins, losses, win_streak, games_played, mmr, solo_elo on players
    for each row
    execute function check_player_achievements_on_player_update();
  end if;
end $$;

insert into achievements (name, description, icon_url, category, condition)
values
  (
    'First Blood',
    'Remporter votre toute première victoire.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3c6.png',
    'victoire',
    '{"type": "wins", "threshold": 1}'::jsonb
  ),
  (
    'Perfect Ten',
    'Atteindre 10 victoires au total.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4af.png',
    'victoire',
    '{"type": "wins", "threshold": 10}'::jsonb
  ),
  (
    'Centurion',
    'Atteindre 100 victoires au total.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3c5.png',
    'victoire',
    '{"type": "wins", "threshold": 100}'::jsonb
  ),
  (
    'On a Roll',
    'Gagner 3 matchs consécutifs.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png',
    'streak',
    '{"type": "win_streak", "threshold": 3}'::jsonb
  ),
  (
    'Flawless Five',
    'Gagner 5 matchs consécutifs.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f9e8.png',
    'streak',
    '{"type": "win_streak", "threshold": 5}'::jsonb
  ),
  (
    'Unstoppable',
    'Gagner 10 matchs consécutifs.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f680.png',
    'streak',
    '{"type": "win_streak", "threshold": 10}'::jsonb
  ),
  (
    'First Steps',
    'Jouer 10 matchs.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f9d7-200d-2642-fe0f.png',
    'participation',
    '{"type": "games_played", "threshold": 10}'::jsonb
  ),
  (
    'Collector',
    'Jouer 50 matchs.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4e6.png',
    'participation',
    '{"type": "games_played", "threshold": 50}'::jsonb
  ),
  (
    'Grinder',
    'Jouer 100 matchs.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26a1.png',
    'participation',
    '{"type": "games_played", "threshold": 100}'::jsonb
  ),
  (
    'Iron Will',
    'Jouer 200 matchs.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f6e1.png',
    'participation',
    '{"type": "games_played", "threshold": 200}'::jsonb
  ),
  (
    'Marathon',
    'Jouer 500 matchs.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3c3.png',
    'participation',
    '{"type": "games_played", "threshold": 500}'::jsonb
  ),
  (
    'Rising Star',
    'Atteindre 1200 ELO.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2b50.png',
    'progression',
    '{"type": "mmr", "threshold": 1200}'::jsonb
  ),
  (
    'Contender',
    'Atteindre 1500 ELO.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3af.png',
    'progression',
    '{"type": "mmr", "threshold": 1500}'::jsonb
  ),
  (
    'Elite',
    'Atteindre 1800 ELO.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3c1.png',
    'progression',
    '{"type": "mmr", "threshold": 1800}'::jsonb
  ),
  (
    'Titan',
    'Atteindre 2000 ELO.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3f9.png',
    'progression',
    '{"type": "mmr", "threshold": 2000}'::jsonb
  ),
  (
    'Lone Wolf',
    'Atteindre 1500 en Solo ELO.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f43a.png',
    'solo',
    '{"type": "solo_elo", "threshold": 1500}'::jsonb
  ),
  (
    'Solo Legend',
    'Atteindre 1800 en Solo ELO.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3c6.png',
    'solo',
    '{"type": "solo_elo", "threshold": 1800}'::jsonb
  ),
  (
    'Giant Slayer',
    'Battre un joueur avec 200+ ELO de plus.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f9dd-200d-2642-fe0f.png',
    'exploit',
    '{"type": "giant_slayer", "delta": 200}'::jsonb
  ),
  (
    'Giant Slayer II',
    'Battre un joueur avec 300+ ELO de plus.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f5e1.png',
    'exploit',
    '{"type": "giant_slayer", "delta": 300}'::jsonb
  ),
  (
    'Comeback Kid',
    'Atteindre 50 défaites, mais continuer à jouer.',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4a5.png',
    'resilience',
    '{"type": "losses", "threshold": 50}'::jsonb
  )
on conflict do nothing;
