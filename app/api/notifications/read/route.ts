import { NextResponse } from "next/server";
import { getSiteUser } from "../../../../src/lib/auth/site-user";
import { markAllRead } from "../../../../src/lib/notifications/notifications";

export const dynamic = "force-dynamic";

/** POST : marque toutes les notifications du compte comme lues. */
export async function POST() {
  const user = await getSiteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    await markAllRead(user.discordId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications read]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
