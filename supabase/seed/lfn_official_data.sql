begin;

delete from public.admin_points_adjustments;
delete from public.lfn_matches;
delete from public.lfn_teams;

insert into public.lfn_teams (name, tag, division, logo_url)
values
  ('BT', 'BT', 'D1', null),
  ('OFA', 'OFA', 'D1', '/images/teams/ofa/cover.png'),
  ('LTG', 'LTG', 'D1', '/images/teams/lache-ton-grab/cover.png'),
  ('RDLD', 'RDLD', 'D1', '/images/teams/rodavland/cover.png'),
  ('T2', 'T2', 'D2', '/images/teams/t2/cover.png'),
  ('VLH', 'VLH', 'D2', '/images/teams/valhalla/cover.png'),
  ('JL', 'JL', 'D2', null),
  ('LZ', 'LZ', 'D2', '/images/teams/les-zommes/cover.png');

with team_map as (
  select id, tag from public.lfn_teams
)
insert into public.lfn_matches (
  scheduled_at,
  division,
  team_a_id,
  team_b_id,
  score_a,
  score_b,
  best_of,
  status,
  day_label
)
values
  ('2025-12-29T19:00:00+01:00', 'D1', (select id from team_map where tag = 'BT'), (select id from team_map where tag = 'LTG'), 3, 1, 5, 'completed', 'Day 1'),
  ('2025-12-29T20:00:00+01:00', 'D1', (select id from team_map where tag = 'OFA'), (select id from team_map where tag = 'RDLD'), 2, 1, 5, 'completed', 'Day 1'),
  ('2025-12-29T21:00:00+01:00', 'D2', (select id from team_map where tag = 'VLH'), (select id from team_map where tag = 'LZ'), 3, 0, 5, 'completed', 'Day 1'),
  ('2025-12-29T22:00:00+01:00', 'D2', (select id from team_map where tag = 'T2'), (select id from team_map where tag = 'JL'), 3, 1, 5, 'completed', 'Day 1'),
  ('2026-01-01T19:00:00+01:00', 'D1', (select id from team_map where tag = 'BT'), (select id from team_map where tag = 'RDLD'), 3, 2, 5, 'completed', 'Day 2'),
  ('2026-01-01T20:00:00+01:00', 'D1', (select id from team_map where tag = 'LTG'), (select id from team_map where tag = 'OFA'), 3, 2, 5, 'completed', 'Day 2'),
  ('2026-01-01T21:00:00+01:00', 'D2', (select id from team_map where tag = 'JL'), (select id from team_map where tag = 'VLH'), 3, 0, 5, 'completed', 'Day 2'),
  ('2026-01-01T22:00:00+01:00', 'D2', (select id from team_map where tag = 'T2'), (select id from team_map where tag = 'LZ'), 3, 2, 5, 'completed', 'Day 2');

insert into public.admin_points_adjustments (team_id, points, reason, applied_at)
values
  ((select id from public.lfn_teams where tag = 'VLH'), 1, 'Adversaire sans rename', now()),
  ((select id from public.lfn_teams where tag = 'RDLD'), 1, 'Raison administrative', now());

commit;
