import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

type RequiredEnvKey = (typeof requiredEnv)[number];

function getMissingEnv(): RequiredEnvKey[] {
  return requiredEnv.filter((key) => !process.env[key]);
}

export async function POST(request: Request) {
  const missing = getMissingEnv();

  if (missing.length > 0) {
    console.error('Missing required environment variables for /api/contributions:', missing);
    return NextResponse.json(
      { error: 'Server misconfigured: missing environment variables.' },
      { status: 500 }
    );
  }

  let payload: {
    tournamentId?: string;
    name?: string;
    amount?: number;
    anonymous?: boolean;
  };

  try {
    payload = await request.json();
  } catch (error) {
    console.error('Invalid JSON for /api/contributions:', error);
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const tournamentId = payload.tournamentId?.trim();
  const amount = Number(payload.amount);
  const anonymous = Boolean(payload.anonymous);
  const name = payload.name?.trim();

  if (!tournamentId) {
    return NextResponse.json({ error: 'Tournament id is required.' }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0.' }, { status: 400 });
  }

  if (!anonymous && !name) {
    return NextResponse.json({ error: 'Name is required unless anonymous.' }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, current_amount')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      console.error('Supabase error in /api/contributions:', tournamentError);
      return NextResponse.json({ error: 'Tournament not found.' }, { status: 404 });
    }

    const { error: insertError } = await supabase.from('contributions').insert({
      tournament_id: tournamentId,
      user_id: anonymous ? null : name,
      amount,
      anonymous,
    });

    if (insertError) {
      console.error('Supabase insert error in /api/contributions:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const currentAmount = Number(tournament.current_amount ?? 0);
    const newAmount = currentAmount + amount;

    const { error: updateError } = await supabase
      .from('tournaments')
      .update({ current_amount: newAmount })
      .eq('id', tournamentId);

    if (updateError) {
      console.error('Supabase update error in /api/contributions:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, total: newAmount });
  } catch (error) {
    console.error('Unexpected error in /api/contributions:', error);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}
