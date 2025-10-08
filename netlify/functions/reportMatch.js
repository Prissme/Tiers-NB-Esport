const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function expectedScore(Ra, Rb) {
  return 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
}

function roundMMR(x) {
  return Math.round(x);
}

exports.handler = async (event) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const body = JSON.parse(event.body || '{}');
    const { teamA = [], teamB = [], scoreA, scoreB } = body;
    const K = body.k || 32;

    if (!teamA.length || !teamB.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'teams required' })
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
    const E_A = expectedScore(R_A, R_B);
    const E_B = expectedScore(R_B, R_A);
    const S_A = scoreA > scoreB ? 1 : (scoreA === scoreB ? 0.5 : 0);
    const S_B = 1 - S_A;

    const updates = [];

    for (const id of teamA) {
      const p = playersMap[id];
      const w = p.weight || 1.0;
      const delta = K * w * (S_A - E_A);
      const newMMR = roundMMR((p.mmr || 1000) + delta);
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
      const w = p.weight || 1.0;
      const delta = K * w * (S_B - E_B);
      const newMMR = roundMMR((p.mmr || 1000) + delta);
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true, updates, match: matchRow })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
