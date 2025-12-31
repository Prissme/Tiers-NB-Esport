import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

type RequiredEnvKey = (typeof requiredEnv)[number];

type PlayerRow = {
  id: string;
  name: string;
  mmr: number;
  solo_elo?: number | null;
  wins?: number | null;
  losses?: number | null;
  games_played?: number | null;
  win_streak?: number | null;
  lose_streak?: number | null;
  discord_id?: string | null;
  profile_image_url?: string | null;
  bio?: string | null;
};

type MatchRow = {
  id: number | string;
  map_mode?: string | null;
  map_name?: string | null;
  team1_ids?: string[] | number[] | null;
  team2_ids?: string[] | number[] | null;
  winner?: string | null;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  team1_score?: number | null;
  team2_score?: number | null;
};

function getMissingEnv(): RequiredEnvKey[] {
  return requiredEnv.filter((key) => !process.env[key]);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isNumeric(value: string) {
  return /^\d+$/.test(value);
}

function parsePlayerTier(mmr: number) {
  if (mmr >= 2200) return 'S';
  if (mmr >= 2000) return 'A';
  if (mmr >= 1800) return 'B';
  if (mmr >= 1600) return 'C';
  if (mmr >= 1400) return 'D';
  return 'E';
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

async function fetchPlayerBySlug(supabase: ReturnType<typeof createClient>, slug: string) {
  if (isUuid(slug)) {
    return supabase.from('players').select('*').eq('id', slug).maybeSingle();
  }

  if (isNumeric(slug)) {
    return supabase.from('players').select('*').eq('discord_id', slug).maybeSingle();
  }

  const name = slug.replace(/-/g, ' ');
  return supabase.from('players').select('*').ilike('name', `%${name}%`).limit(1).maybeSingle();
}

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const missing = getMissingEnv();

  if (missing.length > 0) {
    console.error('Missing required environment variables for /api/player/[slug]:', missing);
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

    const { data: player, error: playerError } = await fetchPlayerBySlug(supabase, params.slug);

    if (playerError || !player) {
      if (playerError) {
        console.error('Supabase error fetching player profile:', playerError);
      }
      return NextResponse.json({ error: 'Player not found.' }, { status: 404 });
    }

    const playerRow = player as PlayerRow;
    const playerDiscordId = playerRow.discord_id ? String(playerRow.discord_id) : null;

    const achievementsPromise = supabase
      .from('achievements')
      .select('id,name,description,icon_url,category,condition')
      .order('created_at', { ascending: true });

    const playerAchievementsPromise = supabase
      .from('player_achievements')
      .select('achievement_id,unlocked_at')
      .eq('player_id', playerRow.id);

    const historySince = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
    const mmrHistoryPromise = supabase
      .from('player_mmr_history')
      .select('mmr,recorded_at')
      .eq('player_id', playerRow.id)
      .gte('recorded_at', historySince)
      .order('recorded_at', { ascending: true });

    let matchesPromise = null;
    if (playerDiscordId) {
      matchesPromise = supabase
        .from('matches')
        .select(
          'id,map_mode,map_name,team1_ids,team2_ids,winner,status,created_at,completed_at,team1_score,team2_score'
        )
        .or(`team1_ids.cs.{${playerDiscordId}},team2_ids.cs.{${playerDiscordId}}`)
        .order('completed_at', { ascending: false })
        .limit(50);
    }

    const [achievementsResult, playerAchievementsResult, mmrHistoryResult, matchesResult] =
      await Promise.all([
        achievementsPromise,
        playerAchievementsPromise,
        mmrHistoryPromise,
        matchesPromise
      ]);

    if (achievementsResult.error) {
      console.error('Supabase error fetching achievements:', achievementsResult.error);
      return NextResponse.json({ error: achievementsResult.error.message }, { status: 500 });
    }

    if (playerAchievementsResult.error) {
      console.error('Supabase error fetching player achievements:', playerAchievementsResult.error);
      return NextResponse.json({ error: playerAchievementsResult.error.message }, { status: 500 });
    }

    if (mmrHistoryResult.error) {
      console.error('Supabase error fetching mmr history:', mmrHistoryResult.error);
      return NextResponse.json({ error: mmrHistoryResult.error.message }, { status: 500 });
    }

    if (matchesResult?.error) {
      console.error('Supabase error fetching matches:', matchesResult.error);
      return NextResponse.json({ error: matchesResult.error.message }, { status: 500 });
    }

    const achievements = achievementsResult.data ?? [];
    const unlockedMap = new Map(
      (playerAchievementsResult.data ?? []).map((row) => [row.achievement_id, row.unlocked_at])
    );

    const eloHistory = (mmrHistoryResult.data ?? []).map((entry) => ({
      date: entry.recorded_at,
      mmr: entry.mmr
    }));

    if (eloHistory.length === 0) {
      eloHistory.push({ date: new Date().toISOString(), mmr: playerRow.mmr ?? 0 });
    }

    const matches = (matchesResult?.data ?? []) as MatchRow[];

    const winRates: Record<string, { wins: number; total: number }> = {};
    matches.forEach((match) => {
      const result = playerDiscordId ? computeMatchResult(match, playerDiscordId) : null;
      if (!result || !match.map_mode) {
        return;
      }
      const entry = winRates[match.map_mode] ?? { wins: 0, total: 0 };
      entry.total += 1;
      if (result === 'win') {
        entry.wins += 1;
      }
      winRates[match.map_mode] = entry;
    });

    const recentMatches = matches.slice(0, 10).map((match) => {
      const result = playerDiscordId ? computeMatchResult(match, playerDiscordId) : null;
      const date = match.completed_at || match.created_at || new Date().toISOString();

      return {
        id: match.id,
        date,
        mode: match.map_mode ?? 'Mode inconnu',
        map: match.map_name ?? 'Carte inconnue',
        result,
        score:
          match.team1_score !== null && match.team2_score !== null
            ? `${match.team1_score} - ${match.team2_score}`
            : null
      };
    });

    const winRateByMode = Object.entries(winRates).map(([mode, stats]) => ({
      mode,
      winRate: stats.total ? Math.round((stats.wins / stats.total) * 100) : 0,
      wins: stats.wins,
      total: stats.total
    }));

    return NextResponse.json({
      player: {
        id: playerRow.id,
        name: playerRow.name,
        mmr: playerRow.mmr ?? 0,
        soloElo: playerRow.solo_elo ?? null,
        wins: playerRow.wins ?? 0,
        losses: playerRow.losses ?? 0,
        gamesPlayed: playerRow.games_played ?? null,
        winStreak: playerRow.win_streak ?? null,
        loseStreak: playerRow.lose_streak ?? null,
        discordId: playerRow.discord_id ?? null,
        avatarUrl: playerRow.profile_image_url ?? null,
        bio: playerRow.bio ?? null,
        tier: parsePlayerTier(playerRow.mmr ?? 0)
      },
      stats: {
        winRateByMode,
        eloHistory
      },
      achievements: achievements.map((achievement) => ({
        ...achievement,
        unlocked_at: unlockedMap.get(achievement.id) ?? null
      })),
      recentMatches
    });
  } catch (error) {
    console.error('Unexpected error in /api/player/[slug]:', error);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}
