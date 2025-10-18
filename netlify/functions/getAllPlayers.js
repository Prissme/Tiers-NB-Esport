const { createClient } = require('@supabase/supabase-js');
const {
  getAvailableColumns,
  applyOptionalDefaults,
} = require('./_shared/playerSchema');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

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
    const optionalColumnList = Array.from(availableOptionalColumns);

    const selectColumns = baseColumns.concat(optionalColumnList);

    const { data, error } = await supabase
      .from('players')
      .select(selectColumns.join(','))
      .eq('active', true)
      .order('mmr', { ascending: false });

    if (error) {
      throw error;
    }

    const players = (data || []).map((player) =>
      applyOptionalDefaults(player, availableOptionalColumns)
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ ok: true, players }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
