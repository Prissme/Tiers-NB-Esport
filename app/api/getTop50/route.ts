import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getServerSupabaseEnv } from '../../../src/lib/env/server';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

type RequiredEnvKey = (typeof requiredEnv)[number];

function getMissingEnv(
  supabaseUrl: string | undefined,
  serviceRoleKey: string | undefined
): RequiredEnvKey[] {
  const missing: RequiredEnvKey[] = [];

  if (!supabaseUrl) {
    missing.push('SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  return missing;
}

export async function GET() {
  const { supabaseUrl, serviceRoleKey } = getServerSupabaseEnv();
  const missing = getMissingEnv(supabaseUrl, serviceRoleKey);

  if (missing.length > 0) {
    console.error('Missing required environment variables for /api/getTop50:', missing);
    return NextResponse.json(
      { error: 'Server misconfigured: missing environment variables.' },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl as string, serviceRoleKey as string);

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
