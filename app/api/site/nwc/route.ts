import { NextResponse } from "next/server";
import { loadNwcState } from "../../../../src/lib/nwc/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await loadNwcState();
    return NextResponse.json({ state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bracket indisponible." },
      { status: 500 }
    );
  }
}
