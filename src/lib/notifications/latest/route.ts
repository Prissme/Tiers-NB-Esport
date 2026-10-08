import { NextResponse } from "next/server";
import { getLocale } from "../../../lib/i18n";
import { getSiteUser } from "../../../../src/lib/auth/site-user";
import { describeNotification, getLatest } from "../../../../src/lib/notifications/notifications";

export const dynamic = "force-dynamic";

/** Appelé par le service worker quand un push arrive : renvoie le texte de la dernière notification. */
export async function GET() {
  const user = await getSiteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const locale = getLocale();
  try {
    const { item, unread } = await getLatest(user.discordId);
    if (!item) {
      return NextResponse.json({ error: "No notification." }, { status: 404 });
    }
    const described = describeNotification(locale, item);
    const body =
      unread > 1
        ? locale === "fr"
          ? `${unread} nouvelles notifications`
          : `${unread} new notifications`
        : described.body;
    return NextResponse.json(
      { title: "LFN", body, url: unread > 1 ? "/chat" : described.url, tag: unread > 1 ? "lfn-multi" : item.id },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[notifications latest]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
