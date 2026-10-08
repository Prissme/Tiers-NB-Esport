import { NextResponse } from "next/server";
import { getSiteUser } from "../../../src/lib/auth/site-user";
import { countUnread, listNotifications } from "../../../src/lib/notifications/notifications";

export const dynamic = "force-dynamic";

/** GET /api/notifications?count=1 → { unread }   |   GET /api/notifications → { notifications, unread } */
export async function GET(request: Request) {
  const user = await getSiteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    if (new URL(request.url).searchParams.get("count")) {
      return NextResponse.json({ unread: await countUnread(user.discordId) });
    }
    const [notifications, unread] = await Promise.all([
      listNotifications(user.discordId),
      countUnread(user.discordId),
    ]);
    return NextResponse.json({ notifications, unread });
  } catch (err) {
    console.error("[notifications GET]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
