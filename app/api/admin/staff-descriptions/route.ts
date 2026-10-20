import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../src/lib/supabase/admin";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { isAdminAuthenticated } from "../../../../src/lib/admin/auth";

const STAFF_KINDS = ["coach", "manager"] as const;
type StaffKind = (typeof STAFF_KINDS)[number];
const MAX_DESCRIPTION_LENGTH = 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;



function isStaffKind(value: unknown): value is StaffKind {
  return typeof value === "string" && (STAFF_KINDS as readonly string[]).includes(value);
}

/** GET : toutes les descriptions coach/manager par joueur. */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = withSchema(createAdminClient());
  const { data, error } = await supabase
    .from("staff_tier_descriptions")
    .select("player_id,kind,description");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const descriptions = (data ?? [])
    .filter((row) => isStaffKind(row.kind))
    .map((row) => ({
      playerId: row.player_id as string,
      kind: row.kind as StaffKind,
      description: (row.description ?? "") as string,
    }));
  return NextResponse.json({ descriptions });
}

/** PUT : enregistre la description d'un joueur pour un rôle ({ playerId, kind, description }). Vide = aucune description. */
export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { playerId?: unknown; kind?: unknown; description?: unknown }
    | null;

  if (typeof body?.playerId !== "string" || !UUID_PATTERN.test(body.playerId)) {
    return NextResponse.json({ error: "Joueur invalide." }, { status: 400 });
  }
  if (!isStaffKind(body?.kind)) {
    return NextResponse.json({ error: "Rôle invalide (coach ou manager)." }, { status: 400 });
  }
  if (typeof body?.description !== "string") {
    return NextResponse.json({ error: "La description doit être du texte." }, { status: 400 });
  }

  const description = body.description.trim();
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `La description ne doit pas dépasser ${MAX_DESCRIPTION_LENGTH} caractères.` },
      { status: 400 },
    );
  }

  const supabase = withSchema(createAdminClient());
  const { error } = await supabase.from("staff_tier_descriptions").upsert(
    {
      player_id: body.playerId,
      kind: body.kind,
      description,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "player_id,kind" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, playerId: body.playerId, kind: body.kind, description });
}
