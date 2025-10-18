const { createClient } = require('@supabase/supabase-js');
const {
  getAvailableColumns,
  applyOptionalDefaults,
} = require('./_shared/playerSchema');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function getTierByRank(rank) {
  if (rank === 1) return 'S';
  if (rank >= 2 && rank <= 4) return 'A';
  if (rank >= 5 && rank <= 10) return 'B';
  if (rank >= 11 && rank <= 20) return 'C';
  if (rank >= 21 && rank <= 35) return 'D';
  if (rank >= 36 && rank <= 50) return 'E';
  return 'No-tier';
}

exports.handler = async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const baseColumns = [
      'id',
      'display_name',
      'mmr',
      'weight',
      'games_played',
      'wins',
      'losses',
      'tier',
    ];

    const availableOptionalColumns = await getAvailableColumns(supabase);
    const selectColumns = baseColumns.concat(Array.from(availableOptionalColumns));

    const { data, error } = await supabase
      .from('players')
      .select(selectColumns.join(','))
      .eq('active', true)
      .order('mmr', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const players = (data || []).map((player, index) => {
      const withOptional = applyOptionalDefaults(player, availableOptionalColumns);
      return {
        ...withOptional,
        tier: getTierByRank(index + 1),
      };
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ ok: true, top: players }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
