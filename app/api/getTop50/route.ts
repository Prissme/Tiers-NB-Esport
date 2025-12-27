import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

type RequiredEnvKey = (typeof requiredEnv)[number];

function getMissingEnv(): RequiredEnvKey[] {
  return requiredEnv.filter((key) => !process.env[key]);
}

export async function GET() {
  const missing = getMissingEnv();

  if (missing.length > 0) {
    console.error('Missing required environment variables for /api/getTop50:', missing);
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

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('active', true)
      .order('mmr', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase error in /api/getTop50:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, top: data });
  } catch (error) {
    console.error('Unexpected error in /api/getTop50:', error);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}
