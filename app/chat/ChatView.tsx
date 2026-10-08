"use client";

import { useRef, useState, type SVGProps } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "../lib/i18n";
import { MessageIcon } from "../components/icons";

const MAX_LENGTH = 280;

type ChatPost = {
  id: string;
  authorDiscordId: string;
  authorName: string;
  parentId: string | null;
  content: string;
  replyCount: number;
  createdAt: string;
};

type Viewer = { discordId: string; name: string } | null;

type Props = {
  locale: Locale;
  viewer: Viewer;
  /** null = fil principal ; sinon page d'un post avec ses réponses */
  root: ChatPost | null;
  initialPosts: ChatPost[];
  initialCursor: string | null;
  loadError: boolean;
};

const copy = {
  fr: {
    title: "Chat",
    subtitle: "Le fil de la communauté.",
    back: "Retour au chat",
    placeholder: "Quoi de neuf ?",
    replyPlaceholder: "Poster ta réponse",
    post: "Poster",
    reply: "Répondre",
    replyingTo: "En réponse à",
    loginPrompt: "Connecte-toi avec Discord pour poster et répondre.",
    login: "Se connecter",
    empty: "Aucun post pour le moment. Lance la discussion.",
    emptyReplies: "Aucune réponse pour le moment.",
    more: "Voir plus",
    loading: "Chargement…",
    delete: "Supprimer",
    confirmDelete: "Supprimer ce post ? Ses réponses seront supprimées aussi.",
    errorPost: "Impossible de poster, réessaie.",
    errorRate: "Doucement, tu postes trop vite.",
    errorDelete: "Impossible de supprimer.",
    errorLoad: "Le chat est momentanément indisponible.",
    now: "à l'instant",
    replies: (n: number) => `${n} réponse${n > 1 ? "s" : ""}`,
  },
  en: {
    title: "Chat",
    subtitle: "The community feed.",
    back: "Back to chat",
    placeholder: "What's happening?",
    replyPlaceholder: "Post your reply",
    post: "Post",
    reply: "Reply",
    replyingTo: "Replying to",
    loginPrompt: "Log in with Discord to post and reply.",
    login: "Log in",
    empty: "No posts yet. Start the conversation.",
    emptyReplies: "No replies yet.",
    more: "Show more",
    loading: "Loading…",
    delete: "Delete",
    confirmDelete: "Delete this post? Its replies will be deleted too.",
    errorPost: "Couldn't post, please try again.",
    errorRate: "Slow down, you're posting too fast.",
    errorDelete: "Couldn't delete.",
    errorLoad: "Chat is temporarily unavailable.",
    now: "just now",
    replies: (n: number) => `${n} ${n === 1 ? "reply" : "replies"}`,
  },
};

function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function formatTime(iso: string, locale: Locale, nowLabel: string): string {
  const date = new Date(iso);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return nowLabel;
  const rtf = new Intl.RelativeTimeFormat(locale === "fr" ? "fr" : "en", { numeric: "auto", style: "short" });
  if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86400) return rtf.format(-Math.round(seconds / 3600), "hour");
  if (seconds < 86400 * 7) return rtf.format(-Math.round(seconds / 86400), "day");
  return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short", year: "numeric" });
}

function Avatar({ discordId, size = 40 }: { discordId: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/site/avatar/${discordId}?size=${size > 40 ? 128 : 64}`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full bg-white/10 object-cover ring-1 ring-white/15"
      onError={(event) => {
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

export default function ChatView({ locale, viewer, root, initialPosts, initialCursor, loadError }: Props) {
  const content = copy[locale];
  const router = useRouter();
  const isThread = root !== null;

  const [posts, setPosts] = useState<ChatPost[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [rootReplyCount, setRootReplyCount] = useState(root?.replyCount ?? 0);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmedLength = draft.trim().length;
  const canSubmit = Boolean(viewer) && !posting && trimmedLength > 0 && draft.length <= MAX_LENGTH;
  const loginHref = `/auth/login?next=${encodeURIComponent(isThread ? `/chat/${root.id}` : "/chat")}`;

  const submit = async () => {
    if (!canSubmit) return;
    setPosting(true);
    setError(null);
    try {
      const response = await fetch("/api/chat/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft, parentId: root?.id ?? null }),
      });
      if (response.status === 429) {
        setError(content.errorRate);
        return;
      }
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { post: ChatPost };
      // Nouveau post en haut du fil ; nouvelle réponse en bas de la discussion
      setPosts((prev) => (isThread ? [...prev, data.post] : [data.post, ...prev]));
      if (isThread) setRootReplyCount((count) => count + 1);
      setDraft("");
    } catch {
      setError(content.errorPost);
    } finally {
      setPosting(false);
    }
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (isThread) {
        params.set("parent", root.id);
        params.set("after", cursor);
      } else {
        params.set("before", cursor);
      }
      const response = await fetch(`/api/chat/posts?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { posts: ChatPost[]; nextCursor: string | null };
      setPosts((prev) => {
        const known = new Set(prev.map((post) => post.id));
        return [...prev, ...data.posts.filter((post) => !known.has(post.id))];
      });
      setCursor(data.nextCursor);
    } catch {
      setError(content.errorLoad);
    } finally {
      setLoadingMore(false);
    }
  };

  const remove = async (post: ChatPost) => {
    if (!window.confirm(content.confirmDelete)) return;
    try {
      const response = await fetch(`/api/chat/posts/${post.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(String(response.status));
      if (isThread && post.id === root.id) {
        router.push("/chat");
        return;
      }
      setPosts((prev) => prev.filter((entry) => entry.id !== post.id));
      if (isThread) setRootReplyCount((count) => Math.max(0, count - 1));
    } catch {
      setError(content.errorDelete);
    }
  };

  const renderPost = (post: ChatPost, options: { big?: boolean; clickable?: boolean } = {}) => {
    const own = viewer?.discordId === post.authorDiscordId;
    const count = post.id === root?.id ? rootReplyCount : post.replyCount;
    return (
      <article
        key={post.id}
        className={`flex gap-3 px-4 ${options.big ? "py-5" : "py-4"} ${
          options.clickable ? "cursor-pointer transition hover:bg-white/[0.025]" : ""
        }`}
        onClick={
          options.clickable
            ? (event) => {
                if ((event.target as HTMLElement).closest("a,button")) return;
                router.push(`/chat/${post.id}`);
              }
            : undefined
        }
      >
        <Avatar discordId={post.authorDiscordId} size={options.big ? 48 : 40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <a
              href={`/player/${post.authorDiscordId}`}
              className="truncate font-semibold text-[color:var(--color-text)] hover:underline"
            >
              {post.authorName}
            </a>
            <span className="text-[color:var(--color-text-faint)]">·</span>
            <time
              dateTime={post.createdAt}
              suppressHydrationWarning
              className="shrink-0 text-xs text-[color:var(--color-text-faint)]"
            >
              {formatTime(post.createdAt, locale, content.now)}
            </time>
            {own ? (
              <button
                type="button"
                onClick={() => remove(post)}
                aria-label={content.delete}
                title={content.delete}
                className="ml-auto rounded-full p-1.5 text-white/35 transition hover:bg-white/[0.06] hover:text-red-400"
              >
                <TrashIcon />
              </button>
            ) : null}
          </div>
          <p
            className={`mt-1 whitespace-pre-wrap break-words text-[color:var(--color-text)] ${
              options.big ? "text-lg leading-relaxed" : "text-[15px] leading-relaxed"
            }`}
          >
            {post.content}
          </p>
          {!post.parentId ? (
            <a
              href={`/chat/${post.id}`}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-[color:var(--color-text-faint)] transition hover:text-[color:var(--color-text)]"
            >
              <MessageIcon className="h-4 w-4" />
              <span>{count > 0 ? (options.big ? content.replies(count) : count) : ""}</span>
            </a>
          ) : null}
        </div>
      </article>
    );
  };

  const composer = viewer ? (
    <div className="flex gap-3 px-4 py-4">
      <Avatar discordId={viewer.discordId} />
      <div className="min-w-0 flex-1">
        {isThread ? (
          <p className="mb-1 text-xs text-[color:var(--color-text-faint)]">
            {content.replyingTo} <span className="text-[color:var(--color-text-muted)]">{root.authorName}</span>
          </p>
        ) : null}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          rows={isThread ? 2 : 3}
          placeholder={isThread ? content.replyPlaceholder : content.placeholder}
          className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[color:var(--color-text)] outline-none placeholder:text-[color:var(--color-text-faint)]"
        />
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-[color:var(--color-border-soft)] pt-3">
          <span
            className={`text-xs ${draft.length > MAX_LENGTH ? "text-red-400" : "text-[color:var(--color-text-faint)]"}`}
          >
            {draft.length}/{MAX_LENGTH}
          </span>
          <div className="flex items-center gap-3">
            {error ? <span className="text-xs text-red-400">{error}</span> : null}
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-full bg-[color:var(--color-accent)] px-5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#20180a] transition hover:bg-[color:var(--color-accent-deep)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isThread ? content.reply : content.post}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
      <p className="text-sm text-[color:var(--color-text-muted)]">{content.loginPrompt}</p>
      <a
        href={loginHref}
        className="rounded-full bg-[color:var(--color-accent)] px-5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#20180a] transition hover:bg-[color:var(--color-accent-deep)]"
      >
        {content.login}
      </a>
    </div>
  );

  const box =
    "overflow-hidden rounded-[14px] border border-[color:var(--color-border-soft)] bg-[rgba(10,12,18,0.72)] backdrop-blur-sm";

  return (
    <div className="space-y-4">
      {isThread ? (
        <a
          href="/chat"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[color:var(--color-text-faint)] transition hover:text-[color:var(--color-text)]"
        >
          <ArrowLeftIcon />
          {content.back}
        </a>
      ) : (
        <header className="mb-2">
          <h1 className="text-3xl font-semibold">{content.title}</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{content.subtitle}</p>
        </header>
      )}

      {isThread ? <div className={box}>{renderPost(root, { big: true })}</div> : null}

      <div className={box}>{composer}</div>

      {loadError ? (
        <p className="rounded-[12px] border border-[color:var(--color-border-soft)] px-4 py-6 text-center text-sm text-[color:var(--color-text-muted)]">
          {content.errorLoad}
        </p>
      ) : (
        <div className={`${box} divide-y divide-[color:var(--color-border-soft)]`}>
          {posts.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[color:var(--color-text-muted)]">
              {isThread ? content.emptyReplies : content.empty}
            </p>
          ) : (
            posts.map((post) => renderPost(post, { clickable: !isThread }))
          )}
          {cursor ? (
            <div className="px-4 py-3 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-accent)] transition hover:underline disabled:opacity-60"
              >
                {loadingMore ? content.loading : content.more}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
