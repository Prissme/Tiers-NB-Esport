import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

type RequiredEnvKey = (typeof requiredEnv)[number];

function getMissingEnv(): RequiredEnvKey[] {
  return requiredEnv.filter((key) => !process.env[key]);
}

export async function GET(
  _request: Request,
  { params }: { params: { tournamentId: string } }
) {
  const missing = getMissingEnv();

  if (missing.length > 0) {
    console.error('Missing required environment variables for /api/prizepool:', missing);
    return NextResponse.json(
      { error: 'Server misconfigured: missing environment variables.' },
      { status: 500 }
    );
  }

  const tournamentId = params.tournamentId;

  if (!tournamentId) {
    return NextResponse.json({ error: 'Tournament id is required.' }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, name, prize_goal, current_amount, status')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      console.error('Supabase tournament error in /api/prizepool:', tournamentError);
      return NextResponse.json({ error: 'Tournament not found.' }, { status: 404 });
    }

    const { data: contributions, error: contributionsError } = await supabase
      .from('contributions')
      .select('id, user_id, amount, anonymous, created_at')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false })
      .limit(25);

    if (contributionsError) {
      console.error('Supabase contributions error in /api/prizepool:', contributionsError);
      return NextResponse.json({ error: contributionsError.message }, { status: 500 });
    }

    const totalFromTournament = Number(tournament.current_amount ?? 0);
    const totalFromContributions = (contributions ?? []).reduce(
      (sum, item) => sum + Number(item.amount ?? 0),
      0
    );

    const total = totalFromTournament > 0 ? totalFromTournament : totalFromContributions;

    const contributors = (contributions ?? []).map((item) => ({
      id: item.id,
      name: item.user_id ?? 'Supporter',
      amount: Number(item.amount ?? 0),
      anonymous: Boolean(item.anonymous),
    }));

    return NextResponse.json({
      tournament: {
        ...tournament,
        prize_goal: Number(tournament.prize_goal ?? 0),
        current_amount: Number(tournament.current_amount ?? 0),
      },
      total,
      contributors,
    });
  } catch (error) {
    console.error('Unexpected error in /api/prizepool:', error);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}
