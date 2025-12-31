insert into public.tournaments (id, name, prize_goal, current_amount, status)
values
  ('00000000-0000-0000-0000-000000000001', 'Tiers NB Esport Invitational', 3500, 1200, 'En cours')
on conflict (id) do update set
  name = excluded.name,
  prize_goal = excluded.prize_goal,
  current_amount = excluded.current_amount,
  status = excluded.status;

insert into public.contributions (tournament_id, user_id, amount, anonymous)
values
  ('00000000-0000-0000-0000-000000000001', 'NovaEdge', 200, false),
  ('00000000-0000-0000-0000-000000000001', null, 150, true),
  ('00000000-0000-0000-0000-000000000001', 'LumaStrike', 350, false),
  ('00000000-0000-0000-0000-000000000001', 'Zenith', 500, false)
on conflict do nothing;
