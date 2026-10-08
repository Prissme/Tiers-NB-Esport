import { NextResponse } from "next/server";
import { getSiteUser } from "../../../../src/lib/auth/site-user";
import {
  getVapidPublicKey,
  isAllowedPushEndpoint,
  removeSubscription,
  saveSubscription,
} from "../../../../src/lib/notifications/push";
import { allow } from "../../../../src/lib/simpleRateLimit";

export const dynamic = "force-dynamic";

/** GET : clé publique VAPID (null si les notifications push ne sont pas configurées). */
export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey() });
}

/** POST { endpoint } : enregistre l'appareil du compte connecté. */
export async function POST(request: Request) {
  const user = await getSiteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!allow(`push-sub:${user.discordId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (!isAllowedPushEndpoint(body?.endpoint)) {
    return NextResponse.json({ error: "Invalid endpoint." }, { status: 400 });
  }

  try {
    await saveSubscription(user.discordId, body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications push POST]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

/** DELETE { endpoint } : retire l'appareil. */
export async function DELETE(request: Request) {
  const user = await getSiteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string" || body.endpoint.length > 1000) {
    return NextResponse.json({ error: "Invalid endpoint." }, { status: 400 });
  }
  try {
    await removeSubscription(body.endpoint, user.discordId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications push DELETE]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
