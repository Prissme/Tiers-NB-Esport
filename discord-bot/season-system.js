'use strict';

const DEFAULT_BASE_ELO = 1000;

function normalizeIdentifier(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildSeasonName(identifier) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) {
    return 'LFN Season';
  }

  return normalized
    .split('-')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');
}

async function getActiveSeason(supabase) {
  const { data, error } = await supabase
    .from('lfn_seasons')
    .select('id,name,identifier,status,starts_at,ends_at,created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load active season: ${error.message}`);
  }

  return data || null;
}

async function getPreviousSeason(supabase, activeSeasonId = null) {
  let query = supabase
    .from('lfn_seasons')
    .select('id,name,identifier,status,starts_at,ends_at,created_at')
    .eq('status', 'completed')
    .order('ends_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (activeSeasonId) {
    query = query.neq('id', activeSeasonId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Unable to load previous season: ${error.message}`);
  }

  return data || null;
}

async function archiveSeasonStats(supabase, seasonId) {
  const { data, error } = await supabase
    .from('players')
    .select('id,solo_elo,wins,losses,games_played')
    .eq('active', true);

  if (error) {
    throw new Error(`Unable to load players for season archive: ${error.message}`);
  }

  const playerRows = Array.isArray(data) ? data : [];

  const { data: pointsRows, error: pointsError } = await supabase
    .from('lfn_player_tier_points')
    .select('player_id,points,tier')
    .eq('season_id', seasonId);

  if (pointsError) {
    throw new Error(`Unable to load tier points for season archive: ${pointsError.message}`);
  }

  const pointsByPlayerId = new Map();
  (pointsRows || []).forEach((row) => {
    pointsByPlayerId.set(row.player_id, row);
  });

  const archiveRows = playerRows.map((player) => {
    const seasonPoints = pointsByPlayerId.get(player.id);
    return {
      season_id: seasonId,
      player_id: player.id,
      points: Number(seasonPoints?.points || 0),
      tier: seasonPoints?.tier || 'Tier E',
      wins: Number(player.wins || 0),
      losses: Number(player.losses || 0),
      games_played: Number(player.games_played || 0),
      solo_elo: Number(player.solo_elo || DEFAULT_BASE_ELO)
    };
  });

  if (!archiveRows.length) {
    return 0;
  }

  const { error: upsertError } = await supabase.from('lfn_player_season_stats').upsert(archiveRows, {
    onConflict: 'season_id,player_id'
  });

  if (upsertError) {
    throw new Error(`Unable to archive season stats: ${upsertError.message}`);
  }

  return archiveRows.length;
}

async function startNewSeason(supabase, { identifier, name = null, resetElo = true, baseElo = DEFAULT_BASE_ELO }) {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!normalizedIdentifier) {
    throw new Error('Season identifier is required.');
  }

  const { data: existingSeason, error: existingSeasonError } = await supabase
    .from('lfn_seasons')
    .select('id,identifier,status')
    .eq('identifier', normalizedIdentifier)
    .limit(1)
    .maybeSingle();

  if (existingSeasonError) {
    throw new Error(`Unable to validate season identifier: ${existingSeasonError.message}`);
  }

  if (existingSeason) {
    throw new Error(`Season identifier already exists: ${normalizedIdentifier}`);
  }

  const activeSeason = await getActiveSeason(supabase);
  let archivedPlayers = 0;

  if (activeSeason?.id) {
    archivedPlayers = await archiveSeasonStats(supabase, activeSeason.id);

    const { error: closeSeasonError } = await supabase
      .from('lfn_seasons')
      .update({ status: 'completed', ends_at: new Date().toISOString() })
      .eq('id', activeSeason.id);

    if (closeSeasonError) {
      throw new Error(`Unable to close current season: ${closeSeasonError.message}`);
    }
  }

  const { data: createdSeason, error: createSeasonError } = await supabase
    .from('lfn_seasons')
    .insert({
      identifier: normalizedIdentifier,
      name: name?.trim() || buildSeasonName(normalizedIdentifier),
      status: 'active',
      starts_at: new Date().toISOString(),
      ends_at: null
    })
    .select('id,name,identifier,starts_at,status')
    .single();

  if (createSeasonError) {
    throw new Error(`Unable to create new season: ${createSeasonError.message}`);
  }

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id')
    .eq('active', true);

  if (playersError) {
    throw new Error(`Unable to list active players for season bootstrap: ${playersError.message}`);
  }

  const pointRows = (players || []).map((player) => ({
    player_id: player.id,
    season_id: createdSeason.id,
    points: 0,
    tier: 'Tier E'
  }));

  if (pointRows.length) {
    const { error: upsertPointsError } = await supabase.from('lfn_player_tier_points').upsert(pointRows, {
      onConflict: 'player_id,season_id'
    });

    if (upsertPointsError) {
      throw new Error(`Unable to initialize season points: ${upsertPointsError.message}`);
    }

    const seasonRows = pointRows.map((row) => ({
      ...row,
      wins: 0,
      losses: 0,
      games_played: 0,
      solo_elo: baseElo
    }));

    const { error: upsertStatsError } = await supabase.from('lfn_player_season_stats').upsert(seasonRows, {
      onConflict: 'season_id,player_id'
    });

    if (upsertStatsError) {
      throw new Error(`Unable to initialize season stats: ${upsertStatsError.message}`);
    }
  }

  const resetPayload = {
    wins: 0,
    losses: 0,
    games_played: 0,
    win_streak: 0,
    lose_streak: 0
  };
  if (resetElo) {
    resetPayload.solo_elo = Number(baseElo || DEFAULT_BASE_ELO);
  }

  const { error: resetError } = await supabase.from('players').update(resetPayload).eq('active', true);
  if (resetError) {
    throw new Error(`Unable to reset player stats for new season: ${resetError.message}`);
  }

  return {
    previousSeason: activeSeason,
    season: createdSeason,
    archivedPlayers,
    initializedPlayers: pointRows.length
  };
}

async function getSeasonLeaderboard(supabase, seasonId, { limit = 50 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  const { data, error } = await supabase
    .from('lfn_player_tier_points')
    .select('player_id,points,tier,players(name,discord_id)')
    .eq('season_id', seasonId)
    .order('points', { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Unable to load season leaderboard: ${error.message}`);
  }

  return (data || []).map((row, index) => ({
    rank: index + 1,
    playerId: row.player_id,
    name: row.players?.name || 'Player',
    discordId: row.players?.discord_id || null,
    points: Number(row.points || 0),
    tier: row.tier || 'Tier E'
  }));
}

async function getSeasonPlayerProfile(supabase, playerId, seasonId) {
  const { data, error } = await supabase
    .from('lfn_player_season_stats')
    .select('points,tier,wins,losses,games_played,solo_elo')
    .eq('season_id', seasonId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load season player profile: ${error.message}`);
  }

  return data || null;
}

module.exports = {
  DEFAULT_BASE_ELO,
  normalizeIdentifier,
  buildSeasonName,
  getActiveSeason,
  getPreviousSeason,
  getSeasonLeaderboard,
  getSeasonPlayerProfile,
  startNewSeason
};
