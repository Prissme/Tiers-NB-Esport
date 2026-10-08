import { NextResponse } from "next/server";
import { getSiteUser } from "../../../../src/lib/auth/site-user";
import { createPost, isUuid, listReplies, listRootPosts } from "../../../../src/lib/chat/posts";
import { allow } from "../../../../src/lib/simpleRateLimit";

export const dynamic = "force-dynamic";

/** GET /api/chat/posts?before=<date>  → fil principal
 *  GET /api/chat/posts?parent=<id>&after=<date> → réponses d'un post */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parent = params.get("parent");

  try {
    if (parent) {
      if (!isUuid(parent)) return NextResponse.json({ error: "Invalid parent." }, { status: 400 });
      return NextResponse.json(await listReplies(parent, params.get("after")));
    }
    return NextResponse.json(await listRootPosts(params.get("before")));
  } catch (err) {
    console.error("[chat/posts GET]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

/** POST { content, parentId? } : publier un post ou une réponse (compte Discord requis). */
export async function POST(request: Request) {
  const user = await getSiteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!allow(`chat:${user.discordId}`, 6, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { content?: unknown; parentId?: unknown } | null;
  if (!body || typeof body.content !== "string") {
    return NextResponse.json({ error: "Invalid content." }, { status: 400 });
  }
  const parentId = body.parentId == null ? null : isUuid(body.parentId) ? body.parentId : undefined;
  if (parentId === undefined) {
    return NextResponse.json({ error: "Invalid parent." }, { status: 400 });
  }

  try {
    const result = await createPost({
      discordId: user.discordId,
      name: user.name,
      content: body.content,
      parentId,
    });
    if (!result.ok) {
      const status = result.reason === "parent_not_found" ? 404 : 400;
      return NextResponse.json({ error: result.reason }, { status });
    }
    return NextResponse.json({ post: result.post }, { status: 201 });
  } catch (err) {
    console.error("[chat/posts POST]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
