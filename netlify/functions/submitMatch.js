const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const K_FACTOR = 100;

function buildResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(payload)
  };
}

async function requireAdmin(supabase, token) {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  const isAdmin = ADMIN_USER_IDS.length > 0 ? ADMIN_USER_IDS.includes(user.id) : false;
  return isAdmin ? user : null;
}

function expectedScore(playerMMR, opponentWeightedMMR) {
  return 1 / (1 + Math.pow(10, (opponentWeightedMMR - playerMMR) / 400));
}

function weightedAverage(players) {
  const totalWeight = players.reduce((acc, player) => acc + (player.weight || 1), 0) || players.length || 1;
  const weightedSum = players.reduce((acc, player) => acc + (player.mmr * (player.weight || 1)), 0);
  return weightedSum / totalWeight;
}

function computeDelta(player, opponents, didWin) {
  const opponentWeightedMMR = weightedAverage(opponents);
  const playerWeight = player.weight || 1;
  const expected = expectedScore(player.mmr, opponentWeightedMMR);
  const score = didWin ? 1 : 0;
  const delta = K_FACTOR * playerWeight * (score - expected);
  return Math.round(delta);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return buildResponse(405, { ok: false, error: 'method_not_allowed' });
  }

  const authorization = event.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) {
    return buildResponse(401, { ok: false, error: 'missing_token' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase credentials missing.');
    return buildResponse(500, { ok: false, error: 'server_misconfigured' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return buildResponse(400, { ok: false, error: 'invalid_json' });
  }

  const winners = Array.isArray(payload.winners) ? payload.winners : [];
  const losers = Array.isArray(payload.losers) ? payload.losers : [];

  if (winners.length !== 3 || losers.length !== 3) {
    return buildResponse(400, { ok: false, error: 'invalid_roster' });
  }

  const uniqueIds = new Set([...winners, ...losers]);
  if (uniqueIds.size !== 6) {
    return buildResponse(400, { ok: false, error: 'duplicate_players' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const adminUser = await requireAdmin(supabase, token);

    if (!adminUser) {
      return buildResponse(403, { ok: false, error: 'forbidden' });
    }

    const { data: players, error } = await supabase
      .from('players')
      .select('id,mmr,weight,games_played,wins,losses')
      .in('id', [...uniqueIds]);

    if (error) {
      throw error;
    }

    if (!players || players.length !== 6) {
      return buildResponse(400, { ok: false, error: 'players_not_found' });
    }

    const playerMap = new Map(players.map((player) => [player.id, player]));
    const winnerPlayers = winners.map((id) => playerMap.get(id));
    const loserPlayers = losers.map((id) => playerMap.get(id));

    if (winnerPlayers.some((player) => !player) || loserPlayers.some((player) => !player)) {
      return buildResponse(400, { ok: false, error: 'players_not_found' });
    }

    const updates = [];

    for (const player of winnerPlayers) {
      const delta = computeDelta(player, loserPlayers, true);
      updates.push({
        id: player.id,
        mmr: Math.max(0, Math.round(player.mmr + delta)),
        wins: (player.wins || 0) + 1,
        losses: player.losses || 0,
        games_played: (player.games_played || 0) + 1
      });
    }

    for (const player of loserPlayers) {
      const delta = computeDelta(player, winnerPlayers, false);
      updates.push({
        id: player.id,
        mmr: Math.max(0, Math.round(player.mmr + delta)),
        wins: player.wins || 0,
        losses: (player.losses || 0) + 1,
        games_played: (player.games_played || 0) + 1
      });
    }

    const updatePromises = updates.map((update) =>
      supabase
        .from('players')
        .update({
          mmr: update.mmr,
          wins: update.wins,
          losses: update.losses,
          games_played: update.games_played
        })
        .eq('id', update.id)
    );

    const results = await Promise.all(updatePromises);

    const updateError = results.find((result) => result.error);
    if (updateError && updateError.error) {
      throw updateError.error;
    }

    return buildResponse(200, { ok: true, updates });
  } catch (err) {
    console.error(err);
    return buildResponse(500, { ok: false, error: 'unexpected_error' });
  }
};
