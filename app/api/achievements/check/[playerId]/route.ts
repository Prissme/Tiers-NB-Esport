import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

type RequiredEnvKey = (typeof requiredEnv)[number];

type PlayerRow = {
  id: string;
  mmr: number;
  solo_elo?: number | null;
  wins?: number | null;
  losses?: number | null;
  games_played?: number | null;
  win_streak?: number | null;
  discord_id?: string | null;
};

type AchievementRow = {
  id: string;
  name: string;
  condition: {
    type: string;
    threshold?: number;
    delta?: number;
  };
};

type MatchRow = {
  team1_ids?: string[] | number[] | null;
  team2_ids?: string[] | number[] | null;
  winner?: string | null;
};

function getMissingEnv(): RequiredEnvKey[] {
  return requiredEnv.filter((key) => !process.env[key]);
}

function normalizeIds(ids: MatchRow['team1_ids']) {
  if (!ids) return [];
  return ids.map((id) => String(id));
}

function computeMatchResult(match: MatchRow, playerDiscordId: string) {
  const team1Ids = normalizeIds(match.team1_ids);
  const team2Ids = normalizeIds(match.team2_ids);
  const inTeam1 = team1Ids.includes(playerDiscordId);
  const inTeam2 = team2Ids.includes(playerDiscordId);
  const winner = match.winner?.toLowerCase();

  if (!inTeam1 && !inTeam2) {
    return null;
  }

  if (!winner) {
    return null;
  }

  if (winner === 'team1') {
    return inTeam1 ? 'win' : 'loss';
  }

  if (winner === 'team2') {
    return inTeam2 ? 'win' : 'loss';
  }

  return null;
}

function evaluateCondition(player: PlayerRow, condition: AchievementRow['condition']) {
  const wins = player.wins ?? 0;
  const losses = player.losses ?? 0;
  const gamesPlayed = player.games_played ?? wins + losses;

  switch (condition.type) {
    case 'wins':
      return wins >= (condition.threshold ?? 0);
    case 'losses':
      return losses >= (condition.threshold ?? 0);
    case 'win_streak':
      return (player.win_streak ?? 0) >= (condition.threshold ?? 0);
    case 'games_played':
      return gamesPlayed >= (condition.threshold ?? 0);
    case 'mmr':
      return (player.mmr ?? 0) >= (condition.threshold ?? 0);
    case 'solo_elo':
      return (player.solo_elo ?? 0) >= (condition.threshold ?? 0);
    default:
      return false;
  }
}

export async function POST(_request: Request, { params }: { params: { playerId: string } }) {
  const missing = getMissingEnv();

  if (missing.length > 0) {
    console.error('Missing required environment variables for /api/achievements/check/[playerId]:', missing);
    return NextResponse.json(
      { error: 'Server misconfigured: missing environment variables.' },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id,mmr,solo_elo,wins,losses,games_played,win_streak,discord_id')
      .or(`id.eq.${params.playerId},discord_id.eq.${params.playerId}`)
      .maybeSingle();

    if (playerError || !player) {
      if (playerError) {
        console.error('Supabase error fetching player for achievement check:', playerError);
      }
      return NextResponse.json({ error: 'Player not found.' }, { status: 404 });
    }

    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('id,name,condition');

    if (achievementsError) {
      console.error('Supabase error fetching achievements:', achievementsError);
      return NextResponse.json({ error: achievementsError.message }, { status: 500 });
    }

    const { data: unlocked, error: unlockedError } = await supabase
      .from('player_achievements')
      .select('achievement_id')
      .eq('player_id', player.id);

    if (unlockedError) {
      console.error('Supabase error fetching unlocked achievements:', unlockedError);
      return NextResponse.json({ error: unlockedError.message }, { status: 500 });
    }

    const unlockedSet = new Set((unlocked ?? []).map((row) => row.achievement_id));
    const playerRow = player as PlayerRow;
    const achievementsToCheck = (achievements ?? []) as AchievementRow[];

    const toUnlock: AchievementRow[] = [];

    for (const achievement of achievementsToCheck) {
      if (unlockedSet.has(achievement.id)) {
        continue;
      }

      if (achievement.condition?.type === 'giant_slayer') {
        if (!playerRow.discord_id) {
          continue;
        }

        const { data: matches, error: matchesError } = await supabase
          .from('matches')
          .select('team1_ids,team2_ids,winner')
          .or(`team1_ids.cs.{${playerRow.discord_id}},team2_ids.cs.{${playerRow.discord_id}}`)
          .order('completed_at', { ascending: false })
          .limit(30);

        if (matchesError) {
          console.error('Supabase error fetching matches for giant slayer:', matchesError);
          return NextResponse.json({ error: matchesError.message }, { status: 500 });
        }

        const opponentIds = new Set<string>();
        (matches ?? []).forEach((match) => {
          const result = computeMatchResult(match as MatchRow, String(playerRow.discord_id));
          if (result !== 'win') {
            return;
          }
          const team1Ids = normalizeIds(match.team1_ids);
          const team2Ids = normalizeIds(match.team2_ids);
          const inTeam1 = team1Ids.includes(String(playerRow.discord_id));
          const opponents = inTeam1 ? team2Ids : team1Ids;
          opponents.forEach((id) => opponentIds.add(id));
        });

        if (opponentIds.size === 0) {
          continue;
        }

        const { data: opponents, error: opponentsError } = await supabase
          .from('players')
          .select('discord_id,mmr')
          .in('discord_id', Array.from(opponentIds));

        if (opponentsError) {
          console.error('Supabase error fetching opponents for giant slayer:', opponentsError);
          return NextResponse.json({ error: opponentsError.message }, { status: 500 });
        }

        const threshold = achievement.condition.delta ?? 200;
        const playerMmr = playerRow.mmr ?? 0;
        const slayed = (opponents ?? []).some((opponent) => (opponent.mmr ?? 0) >= playerMmr + threshold);

        if (slayed) {
          toUnlock.push(achievement);
        }

        continue;
      }

      if (evaluateCondition(playerRow, achievement.condition)) {
        toUnlock.push(achievement);
      }
    }

    if (toUnlock.length > 0) {
      const { error: insertError } = await supabase
        .from('player_achievements')
        .upsert(
          toUnlock.map((achievement) => ({
            player_id: player.id,
            achievement_id: achievement.id,
            unlocked_at: new Date().toISOString()
          })),
          { onConflict: 'player_id,achievement_id' }
        );

      if (insertError) {
        console.error('Supabase error unlocking achievements:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      unlocked: toUnlock.map((achievement) => achievement.name),
      count: toUnlock.length
    });
  } catch (error) {
    console.error('Unexpected error in /api/achievements/check/[playerId]:', error);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}
