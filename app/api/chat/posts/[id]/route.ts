import { NextResponse } from "next/server";
import { getSiteUser } from "../../../../../src/lib/auth/site-user";
import { deletePost, isUuid } from "../../../../../src/lib/chat/posts";
import { allow } from "../../../../../src/lib/simpleRateLimit";

export const dynamic = "force-dynamic";

/** DELETE : supprime son propre post (et ses réponses). */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSiteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  if (!allow(`chat-del:${user.discordId}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const result = await deletePost(params.id, user.discordId);
    if (result === "not_found") return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (result === "forbidden") return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[chat/posts DELETE]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
