// EMPLACEMENT : app/api/admin/nwc/route.ts  (lecture + actions sur le bracket NWC)
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "../../../../src/lib/admin/auth";
import { loadNwcState, saveNwcState } from "../../../../src/lib/nwc/store";
import {
  applyManual,
  createTournament,
  emptyState,
  NwcError,
  nextRound,
  setWinner,
  startPhase2,
  undoWinner,
  type NwcState,
} from "../../../../src/lib/nwc/swiss";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "Unauthorized." }, { status: 401 });

export async function GET() {
  if (!(await isAdminAuthenticated())) return unauthorized();
  try {
    return NextResponse.json({ state: await loadNwcState() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de charger le bracket." },
      { status: 500 }
    );
  }
}

type ActionBody = {
  action?: string;
  names?: unknown;
  index?: unknown;
  which?: unknown;
  text?: unknown;
};

const parseNames = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.map(String) : String(raw ?? "").split("\n");

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return unauthorized();
  try {
    const body = (await request.json()) as ActionBody;
    const current = await loadNwcState();
    let next: NwcState;

    switch (body.action) {
      case "create":
        next = createTournament(parseNames(body.names));
        break;
      case "nextRound":
        next = nextRound(current);
        break;
      case "setWinner":
        next = setWinner(current, Number(body.index), Number(body.which) as 0 | 1);
        break;
      case "undoWinner":
        next = undoWinner(current, Number(body.index));
        break;
      case "startPhase2":
        next = startPhase2(current);
        break;
      case "applyManual":
        next = applyManual(current, String(body.text ?? ""));
        break;
      case "reset":
        next = emptyState();
        break;
      default:
        return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }

    await saveNwcState(next);
    return NextResponse.json({ state: next });
  } catch (error) {
    if (error instanceof NwcError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action impossible." },
      { status: 500 }
    );
  }
}
