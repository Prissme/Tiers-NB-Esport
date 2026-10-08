import type { Metadata } from "next";
import { getLocale } from "../lib/i18n";
import { getSiteUser } from "../../src/lib/auth/site-user";
import { listRootPosts, type PostsPage } from "../../src/lib/chat/posts";
import ChatView from "./ChatView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chat",
  description: "Le fil de la communauté LFN.",
};

export default async function ChatPage() {
  const locale = getLocale();
  const viewer = await getSiteUser();

  let page: PostsPage = { posts: [], nextCursor: null };
  let loadError = false;
  try {
    page = await listRootPosts();
  } catch (error) {
    console.error("[chat]", error);
    loadError = true;
  }

  return (
    <main className="min-h-screen px-4 pb-20 pt-10 text-[color:var(--color-text)]">
      <div className="mx-auto max-w-2xl">
        <ChatView
          locale={locale}
          viewer={viewer ? { discordId: viewer.discordId, name: viewer.name } : null}
          root={null}
          initialPosts={page.posts}
          initialCursor={page.nextCursor}
          loadError={loadError}
        />
      </div>
    </main>
  );
}
