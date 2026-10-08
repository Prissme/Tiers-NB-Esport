import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getLocale } from "../../lib/i18n";
import { getSiteUser } from "../../../src/lib/auth/site-user";
import { getPost, listReplies, type ChatPost, type PostsPage } from "../../../src/lib/chat/posts";
import ChatView from "../ChatView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatThreadPage({ params }: { params: { id: string } }) {
  const locale = getLocale();

  let root: ChatPost | null = null;
  let loadError = false;
  try {
    root = await getPost(params.id);
  } catch (error) {
    console.error("[chat thread]", error);
    loadError = true;
  }
  if (!root && !loadError) notFound();
  if (!root) {
    // Base indisponible : on affiche le fil d'accueil plutôt qu'un faux 404
    redirect("/chat");
  }

  // Une réponse n'a pas de page propre : on renvoie vers le post d'origine
  if (root.parentId) redirect(`/chat/${root.parentId}`);

  const viewer = await getSiteUser();

  let page: PostsPage = { posts: [], nextCursor: null };
  try {
    page = await listReplies(root.id);
  } catch (error) {
    console.error("[chat replies]", error);
    loadError = true;
  }

  return (
    <main className="min-h-screen px-4 pb-20 pt-10 text-[color:var(--color-text)]">
      <div className="mx-auto max-w-2xl">
        <ChatView
          locale={locale}
          viewer={viewer ? { discordId: viewer.discordId, name: viewer.name } : null}
          root={root}
          initialPosts={page.posts}
          initialCursor={page.nextCursor}
          loadError={loadError}
        />
      </div>
    </main>
  );
}
