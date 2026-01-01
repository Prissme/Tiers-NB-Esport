# Données officielles LFN (Day 1 / Day 2)

Ce document accompagne le seed officiel (`supabase/seed/lfn_official_data.sql`).

## Vérification

### 1) Vérifier les matchs Day 1 / Day 2

```sql
select
  day_label,
  division,
  ta.tag as team_a,
  tb.tag as team_b,
  score_a,
  score_b,
  scheduled_at
from lfn_matches
join lfn_teams ta on ta.id = lfn_matches.team_a_id
join lfn_teams tb on tb.id = lfn_matches.team_b_id
order by scheduled_at;
```

**Résultat attendu (ordre chronologique)**

| day_label | division | team_a | team_b | score_a | score_b | date |
| --- | --- | --- | --- | --- | --- | --- |
| Day 1 | D1 | BT | LTG | 3 | 1 | 2025-12-29 |
| Day 1 | D1 | OFA | RDLD | 2 | 1 | 2025-12-29 |
| Day 1 | D2 | VLH | LZ | 3 | 0 | 2025-12-29 |
| Day 1 | D2 | T2 | JL | 3 | 1 | 2025-12-29 |
| Day 2 | D1 | BT | RDLD | 3 | 2 | 2026-01-01 |
| Day 2 | D1 | LTG | OFA | 3 | 2 | 2026-01-01 |
| Day 2 | D2 | JL | VLH | 3 | 0 | 2026-01-01 |
| Day 2 | D2 | T2 | LZ | 3 | 2 | 2026-01-01 |

### 2) Vérifier les points administratifs

```sql
select t.tag, a.points, a.reason, a.applied_at
from admin_points_adjustments a
join lfn_teams t on t.id = a.team_id
order by t.tag;
```

**Résultat attendu**

| tag | points | reason |
| --- | --- | --- |
| RDLD | 1 | Raison administrative |
| VLH | 1 | Adversaire sans rename |

### 3) Vérifier le classement cumulé (points = sets gagnés + admin)

```sql
select
  division,
  team_tag,
  wins,
  losses,
  sets_won,
  sets_lost,
  points_admin,
  points_total
from lfn_standings
order by division, points_total desc, sets_won desc, team_tag;
```

**Résultat attendu**

**Division 1**

| team_tag | points_total |
| --- | --- |
| BT | 6 |
| RDLD | 4 |
| OFA | 4 |
| LTG | 4 |

**Division 2**

| team_tag | points_total |
| --- | --- |
| T2 | 6 |
| VLH | 4 |
| JL | 4 |
| LZ | 3 |
