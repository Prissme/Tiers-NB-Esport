import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { isAdminAuthenticated } from "../../../../src/lib/admin/auth";

const STAFF_KINDS = ["coach", "manager"] as const;
type StaffKind = (typeof STAFF_KINDS)[number];
const MAX_DESCRIPTION_LENGTH = 1000;

function isStaffKind(value: unknown): value is StaffKind {
  return typeof value === "string" && (STAFF_KINDS as readonly string[]).includes(value);
}

/** GET : descriptions actuelles des rôles coach et manager. */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = withSchema(createServerClient());
  const { data, error } = await supabase
    .from("staff_tier_descriptions")
    .select("kind,description");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const descriptions: Record<StaffKind, string> = { coach: "", manager: "" };
  for (const row of data ?? []) {
    if (isStaffKind(row.kind)) {
      descriptions[row.kind] = row.description ?? "";
    }
  }
  return NextResponse.json({ descriptions });
}

/** PUT : enregistre la description d'un rôle ({ kind, description }). Chaîne vide = pas de description. */
export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { kind?: unknown; description?: unknown }
    | null;

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

  const supabase = withSchema(createServerClient());
  const { error } = await supabase.from("staff_tier_descriptions").upsert(
    { kind: body.kind, description, updated_at: new Date().toISOString() },
    { onConflict: "kind" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, kind: body.kind, description });
}
