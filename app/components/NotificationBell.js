"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../lib/i18n";

type NotificationItem = {
  id: string;
  type: "reply" | "like";
  actorDiscordId: string;
  actorName: string;
  refId: string | null;
  snippet: string | null;
  read: boolean;
  createdAt: string;
};

type PushState = "checking" | "unsupported" | "off" | "on" | "denied" | "busy";

const POLL_MS = 120_000;

const copy = {
  fr: {
    bell: "Notifications",
    title: "Notifications",
    empty: "Rien pour le moment. Tu seras prévenu quand quelqu'un répond à un de tes posts ou aime ton profil.",
    reply: "a répondu à ton post",
    like: "a aimé ton profil",
    now: "à l'instant",
    enable: "Activer les notifications sur cet appareil",
    enabled: "Notifications activées sur cet appareil",
    disable: "Désactiver",
    denied: "Notifications bloquées : autorise-les dans les réglages du navigateur.",
    unavailable: "Les notifications push ne sont pas disponibles pour le moment.",
    failed: "Impossible d'activer les notifications.",
  },
  en: {
    bell: "Notifications",
    title: "Notifications",
    empty: "Nothing yet. You'll be notified when someone replies to one of your posts or likes your profile.",
    reply: "replied to your post",
    like: "liked your profile",
    now: "just now",
    enable: "Enable notifications on this device",
    enabled: "Notifications enabled on this device",
    disable: "Turn off",
    denied: "Notifications are blocked: allow them in your browser settings.",
    unavailable: "Push notifications are not available right now.",
    failed: "Couldn't enable notifications.",
  },
};

function formatTime(iso: string, locale: Locale, nowLabel: string): string {
  const date = new Date(iso);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return nowLabel;
  const rtf = new Intl.RelativeTimeFormat(locale === "fr" ? "fr" : "en", { numeric: "auto", style: "short" });
  if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86400) return rtf.format(-Math.round(seconds / 3600), "hour");
  if (seconds < 86400 * 7) return rtf.format(-Math.round(seconds / 86400), "day");
  return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short" });
}

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function NotificationBell({ locale }: { locale: Locale }) {
  const content = copy[locale];
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [pushState, setPushState] = useState<PushState>("checking");
  const [message, setMessage] = useState<string | null>(null);

  // Le header contient 2 cloches (desktop / mobile), une seule est visible : on ne sonde que celle-là
  const isVisible = () => Boolean(rootRef.current && rootRef.current.offsetParent !== null);

  const refreshCount = useCallback(async () => {
    if (!isVisible() || document.visibilityState !== "visible") return;
    try {
      const response = await fetch("/api/notifications?count=1", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { unread: number };
      setUnread(data.unread);
    } catch {
      // réseau indisponible : on réessaiera au prochain passage
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = window.setInterval(refreshCount, POLL_MS);
    const onVisible = () => refreshCount();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshCount]);

  // État des notifications push sur cet appareil
  useEffect(() => {
    let cancelled = false;
    const detect = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (!cancelled) setPushState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setPushState("denied");
        return;
      }
      if (Notification.permission === "granted") {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (!cancelled) setPushState(subscription ? "on" : "off");
        return;
      }
      if (!cancelled) setPushState("off");
    };
    detect().catch(() => !cancelled && setPushState("unsupported"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Fermeture au clic extérieur / Échap
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    setMessage(null);
    if (!next) return;
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { notifications: NotificationItem[]; unread: number };
      setItems(data.notifications);
      if (data.unread > 0) {
        // Les non lues restent en surbrillance dans la liste, mais le badge repart à zéro
        setUnread(0);
        fetch("/api/notifications/read", { method: "POST" }).catch(() => undefined);
      }
    } catch {
      setItems((prev) => prev ?? []);
    }
  };

  const enablePush = async () => {
    setPushState("busy");
    setMessage(null);
    try {
      // Doit être déclenché par un clic : le navigateur demande alors la permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "off");
        return;
      }
      const keyResponse = await fetch("/api/notifications/push");
      const { publicKey } = (await keyResponse.json()) as { publicKey: string | null };
      if (!publicKey) {
        setPushState("off");
        setMessage(content.unavailable);
        return;
      }
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));
      const saved = await fetch("/api/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      if (!saved.ok) throw new Error(String(saved.status));
      setPushState("on");
    } catch {
      setPushState("off");
      setMessage(content.failed);
    }
  };

  const disablePush = async () => {
    setPushState("busy");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/notifications/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPushState("off");
    } catch {
      setPushState("on");
    }
  };

  const hrefFor = (item: NotificationItem) => (item.type === "reply" && item.refId ? `/chat/${item.refId}` : "/player/me");

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        aria-label={content.bell}
        aria-expanded={open}
        title={content.bell}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border)]"
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[color:var(--color-accent)] px-1 text-[10px] font-bold leading-none text-[#20180a]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed left-3 right-3 top-[76px] z-50 overflow-hidden rounded-[14px] border border-[color:var(--color-border-soft)] bg-[#0d1119] shadow-[0_20px_60px_rgba(0,0,0,0.6)] md:absolute md:left-auto md:right-0 md:top-full md:mt-3 md:w-[380px]">
          <div className="border-b border-[color:var(--color-border-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-text-faint)]">
            {content.title}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {items === null ? (
              <div className="px-4 py-8 text-center text-sm text-[color:var(--color-text-faint)]">…</div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm leading-relaxed text-[color:var(--color-text-muted)]">
                {content.empty}
              </p>
            ) : (
              items.map((item) => (
                <a
                  key={item.id}
                  href={hrefFor(item)}
                  className={`flex gap-3 border-b border-[color:var(--color-border-soft)] px-4 py-3 transition last:border-b-0 hover:bg-white/[0.04] ${
                    item.read ? "" : "bg-[rgba(242,209,132,0.06)]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/site/avatar/${item.actorDiscordId}?size=64`}
                    alt=""
                    width={36}
                    height={36}
                    loading="lazy"
                    className="h-9 w-9 shrink-0 rounded-full bg-white/10 object-cover ring-1 ring-white/15"
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="text-[color:var(--color-text)]">
                      <span className="font-semibold">{item.actorName}</span>{" "}
                      <span className="text-[color:var(--color-text-muted)]">
                        {item.type === "reply" ? content.reply : content.like}
                      </span>
                    </p>
                    {item.snippet ? (
                      <p className="mt-0.5 truncate text-xs text-[color:var(--color-text-faint)]">{item.snippet}</p>
                    ) : null}
                    <time
                      dateTime={item.createdAt}
                      suppressHydrationWarning
                      className="mt-1 block text-[11px] text-[color:var(--color-text-faint)]"
                    >
                      {formatTime(item.createdAt, locale, content.now)}
                    </time>
                  </div>
                  {!item.read ? (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[color:var(--color-accent)]" aria-hidden="true" />
                  ) : null}
                </a>
              ))
            )}
          </div>

          {pushState !== "checking" && pushState !== "unsupported" ? (
            <div className="border-t border-[color:var(--color-border-soft)] px-4 py-3 text-xs">
              {pushState === "denied" ? (
                <p className="text-[color:var(--color-text-faint)]">{content.denied}</p>
              ) : pushState === "on" ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[color:var(--color-text-muted)]">{content.enabled}</span>
                  <button
                    type="button"
                    onClick={disablePush}
                    className="font-semibold uppercase tracking-[0.1em] text-[color:var(--color-text-faint)] transition hover:text-[color:var(--color-text)]"
                  >
                    {content.disable}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={enablePush}
                  disabled={pushState === "busy"}
                  className="font-semibold uppercase tracking-[0.1em] text-[color:var(--color-accent)] transition hover:underline disabled:opacity-60"
                >
                  {content.enable}
                </button>
              )}
              {message ? <p className="mt-2 text-red-400">{message}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
