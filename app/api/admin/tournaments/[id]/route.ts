// EMPLACEMENT : app/api/admin/tournaments/[id]/route.ts  (modifier + supprimer)
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../../src/lib/supabase/schema";
import { isAdminAuthenticated } from "../../../../../src/lib/admin/auth";
import {
  mapTournamentRow,
  parseTournamentInput,
  TOURNAMENT_COLUMNS,
  type TournamentRow,
} from "../../../../../src/lib/tournaments";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const parsed = parseTournamentInput(await request.json(), true);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const supabase = withSchema(createAdminClient());
    const { data, error } = await supabase
      .from("lfn_tournaments")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select(TOURNAMENT_COLUMNS)
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ tournament: mapTournamentRow(data as TournamentRow) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update tournament." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const supabase = withSchema(createAdminClient());
    const { error } = await supabase.from("lfn_tournaments").delete().eq("id", params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete tournament." },
      { status: 500 }
    );
  }
}
