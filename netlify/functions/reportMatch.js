const { v4: uuidv4 } = require('uuid');
const { validateAdminToken } = require('./_shared/admin');
const { ensureSupabaseClient, DEFAULT_HEADERS } = require('./_shared/supabase');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isPositiveInteger(value) {
  return Number.isInteger(value) && value >= 0 && value <= 1000;
}

function sanitizeTeam(team) {
  if (!Array.isArray(team) || team.length === 0 || team.length > 5) {
    return null;
  }

  const unique = new Set();
  for (const id of team) {
    if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
      return null;
    }
    unique.add(id);
  }
  return Array.from(unique);
}

function expectedScore(Ra, Rb) {
  return 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
}

function roundMMR(x) {
  return Math.round(x);
}

exports.handler = async (event) => {
  try {
    const authCheck = validateAdminToken(event?.headers || {});
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const { client: supabase, errorResponse } = ensureSupabaseClient();
    if (!supabase) {
      return errorResponse;
    }
    const body = JSON.parse(event.body || '{}');
    const sanitizedTeamA = sanitizeTeam(body.teamA);
    const sanitizedTeamB = sanitizeTeam(body.teamB);
    const scoreA = typeof body.scoreA === 'number' ? body.scoreA : Number(body.scoreA);
    const scoreB = typeof body.scoreB === 'number' ? body.scoreB : Number(body.scoreB);
    const parsedK = typeof body.k === 'number' ? body.k : Number(body.k);
    const K = Number.isFinite(parsedK) && parsedK > 0 && parsedK <= 250 ? parsedK : 100;

    if (!sanitizedTeamA || !sanitizedTeamB) {
      return {
        statusCode: 400,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ ok: false, error: 'Equipes invalides' })
      };
    }

    if (!isPositiveInteger(scoreA) || !isPositiveInteger(scoreB) || scoreA === scoreB) {
      return {
        statusCode: 400,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ ok: false, error: 'Scores invalides' })
      };
    }

    const teamA = sanitizedTeamA;
    const teamB = sanitizedTeamB;

    const duplicate = teamA.find(id => teamB.includes(id));
    if (duplicate) {
      return {
        statusCode: 400,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ ok: false, error: 'Un joueur ne peut pas être dans les deux équipes' })
      };
    }

    const ids = [...teamA, ...teamB];
    const { data: playersRaw, error: fetchErr } = await supabase
      .from('players')
      .select('*')
      .in('id', ids);
    
    if (fetchErr) throw fetchErr;

    const playersMap = {};
    playersRaw.forEach(p => { playersMap[p.id] = p; });

    function teamRating(team) {
      let totalWeight = 0;
      let weightedSum = 0;
      team.forEach(id => {
        const p = playersMap[id];
        const w = p?.weight || 1.0;
        weightedSum += (p?.mmr || 1000) * w;
        totalWeight += w;
      });
      return (totalWeight === 0) ? 1000 : (weightedSum / totalWeight);
    }

    const R_A = teamRating(teamA);
    const R_B = teamRating(teamB);
    const S_A = scoreA > scoreB ? 1 : (scoreA === scoreB ? 0.5 : 0);
    const S_B = 1 - S_A;

    const updates = [];

    // Calcul individuel basé sur le MMR de chaque joueur vs l'équipe adverse
    for (const id of teamA) {
      const p = playersMap[id];
      const playerMMR = p.mmr || 1000;
      const w = p.weight || 1.0;
      
      // Probabilité de victoire individuelle vs l'équipe adverse
      const E_individual = expectedScore(playerMMR, R_B);
      const delta = K * w * (S_A - E_individual);
      const newMMR = roundMMR(playerMMR + delta);
      
      updates.push({
        id,
        mmr: newMMR,
        games_played: (p.games_played || 0) + 1,
        wins: (p.wins || 0) + (S_A === 1 ? 1 : 0),
        losses: (p.losses || 0) + (S_A === 0 ? 1 : 0)
      });
    }

    for (const id of teamB) {
      const p = playersMap[id];
      const playerMMR = p.mmr || 1000;
      const w = p.weight || 1.0;
      
      // Probabilité de victoire individuelle vs l'équipe adverse
      const E_individual = expectedScore(playerMMR, R_A);
      const delta = K * w * (S_B - E_individual);
      const newMMR = roundMMR(playerMMR + delta);
      
      updates.push({
        id,
        mmr: newMMR,
        games_played: (p.games_played || 0) + 1,
        wins: (p.wins || 0) + (S_B === 1 ? 1 : 0),
        losses: (p.losses || 0) + (S_B === 0 ? 1 : 0)
      });
    }

    for (const u of updates) {
      const { error: upErr } = await supabase.from('players').update({
        mmr: u.mmr,
        games_played: u.games_played,
        wins: u.wins,
        losses: u.losses
      }).eq('id', u.id);
      if (upErr) throw upErr;
    }

    const matchRow = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      teama: teamA,
      teamb: teamB,
      scorea: scoreA,
      scoreb: scoreB,
      processed: true,
      k_factor_used: K
    };
    
    const { error: mErr } = await supabase.from('matches').insert([matchRow]);
    if (mErr) throw mErr;

    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ ok: true, updates, match: matchRow })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
