"use client";

import { useState } from "react";
import { HeartIcon } from "./icons";

type Props = {
  playerId: string;
  initialCount: number;
  initialLiked: boolean;
  /** null = visiteur non connecté (lien vers le login Discord) */
  loginHref: string | null;
  disabled?: boolean; // son propre profil
  labels: { like: string; unlike: string; login: string; own: string; error: string };
};

export default function LikeButton({ playerId, initialCount, initialLiked, loginHref, disabled, labels }: Props) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const base =
    "inline-flex items-center gap-2 rounded-[10px] border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border)]";

  if (loginHref) {
    return (
      <a
        href={loginHref}
        title={labels.login}
        className={`${base} border-[color:var(--color-border-soft)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]`}
      >
        <HeartIcon className="h-4 w-4" />
        <span>{count}</span>
      </a>
    );
  }

  if (disabled) {
    return (
      <span
        title={labels.own}
        className={`${base} cursor-default border-[color:var(--color-border-soft)] text-[color:var(--color-text-muted)]`}
      >
        <HeartIcon filled className="h-4 w-4 text-[#ef4444]" />
        <span>{count}</span>
      </span>
    );
  }

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    // Mise à jour optimiste
    const prev = { count, liked };
    setLiked(!liked);
    setCount(count + (liked ? -1 : 1));
    try {
      const res = await fetch("/api/profile/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { count: number; liked: boolean };
      setCount(data.count);
      setLiked(data.liked);
    } catch {
      setCount(prev.count);
      setLiked(prev.liked);
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={liked}
        title={liked ? labels.unlike : labels.like}
        className={`${base} ${
          liked
            ? "border-[rgba(239,68,68,0.5)] bg-[rgba(239,68,68,0.12)] text-[color:var(--color-text)]"
            : "border-[color:var(--color-border-soft)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
        } disabled:opacity-70`}
      >
        <HeartIcon filled={liked} className={`h-4 w-4 transition ${liked ? "text-[#ef4444]" : ""}`} />
        <span>{count}</span>
      </button>
      {error ? <span className="text-xs text-red-400">{labels.error}</span> : null}
    </div>
  );
}
