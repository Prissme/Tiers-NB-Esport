"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DiscordIcon from "./DiscordIcon";
import LanguageSwitcher from "./LanguageSwitcher";
import type { Locale } from "../lib/i18n";
import type { SiteUser } from "../../src/lib/auth/site-user";
import ReloadingImage from "./ReloadingImage";

const logoUrl = "/LogoLFN.webp";

const DISCORD_INVITE = "https://discord.gg/q6sFPWCKD7";

const navLinks = {
  fr: [
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Évènements", href: "/events" },
    { label: "Règlement", href: "/rulebook" },
  ],
  en: [
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Events", href: "/events" },
    { label: "Rulebook", href: "/rulebook" },
  ],
};

const copy = {
  fr: {
    logoAlt: "Logo LFN",
    signup: "S'inscrire",
    logout: "Se déconnecter",
    join: "Rejoindre",
    openMenu: "Ouvrir le menu",
  },
  en: {
    logoAlt: "LFN logo",
    signup: "Sign up",
    logout: "Log out",
    join: "Join",
    openMenu: "Open menu",
  },
};

export default function Header({ locale, user }: { locale: Locale; user: SiteUser | null }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const content = copy[locale];
  const links = navLinks[locale];
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <header className="site-header relative z-20">
      <div className="header-shell">
        <div className="header-left">
          <Link href="/" className="header-brand" aria-label={content.logoAlt}>
            <span className="header-logo">
              <ReloadingImage
                src={logoUrl}
                alt={content.logoAlt}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </span>
          </Link>
          <span className="header-divider hidden md:block" aria-hidden="true" />
          <nav className="hidden items-center gap-11 pl-4 md:flex">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative py-2 text-[15px] font-medium tracking-[0.01em] transition-colors duration-200 ${
                    active ? "text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  {/* Losange doré : repère de la page active, apparaît au survol */}
                  <span
                    aria-hidden="true"
                    className={`absolute -left-4 top-1/2 h-[6px] w-[6px] -translate-y-1/2 rotate-45 bg-[color:var(--color-accent)] shadow-[0_0_8px_rgba(242,209,132,0.7)] transition duration-200 ${
                      active ? "scale-100 opacity-100" : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-60"
                    }`}
                  />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="header-right hidden md:flex">
          <LanguageSwitcher locale={locale} />
          {/* Invitation au serveur Discord (pour les nouveaux) */}
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            aria-label={content.join}
            title={content.join}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-[rgba(255,255,255,0.04)] text-[color:var(--color-text-faint)] transition hover:bg-[rgba(255,255,255,0.1)] hover:text-[color:var(--color-text)]"
          >
            <DiscordIcon size={20} />
          </a>
          {user ? (
            <div className="flex items-center gap-2">
              <a
                href="/player/me"
                className="group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-sm text-[color:var(--color-text)] transition hover:bg-white/[0.06]"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-[rgba(242,209,132,0.45)] transition group-hover:ring-[rgba(242,209,132,0.9)]"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <span className="max-w-[140px] truncate">{user.name}</span>
              </a>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  aria-label={content.logout}
                  title={content.logout}
                  className="group flex h-9 w-9 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border)]"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <g className="transition-transform duration-200 group-hover:translate-x-0.5">
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </g>
                  </svg>
                </button>
              </form>
            </div>
          ) : (
            // <a> natif : /auth/login redirige vers Discord (un <Link> le prefetcherait)
            <a
              href="/auth/login"
              aria-label={content.signup}
              className="header-cta relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[8px] bg-[color:var(--color-accent)] px-7 py-[14px] text-xs font-semibold uppercase tracking-[0.12em] text-[#20180a] shadow-[0_0_30px_rgba(201,178,106,0.35)] transition duration-300 hover:bg-[color:var(--color-accent-deep)]"
            >
              <span className="flex items-center gap-2">
                {content.signup} <DiscordIcon size={20} />
              </span>
            </a>
          )}
        </div>
        <div className="flex items-center gap-3 md:hidden">
          {user?.avatarUrl ? (
            <a href="/player/me" aria-label={user.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            </a>
          ) : null}
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-expanded={isMenuOpen}
            aria-label={content.openMenu}
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            <span className="mobile-menu-bar" />
            <span className="mobile-menu-bar" />
            <span className="mobile-menu-bar" />
          </button>
        </div>
      </div>
      <div className={`mobile-menu-panel ${isMenuOpen ? "is-open" : ""}`}>
        <div className="mobile-menu-content">
          {links.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}>
                {link.label}
              </Link>
            )
          )}
          {user ? (
            <form action="/auth/logout" method="post" className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <span className="truncate">{user.name}</span>
              </span>
              <button type="submit">{content.logout}</button>
            </form>
          ) : (
            <a href="/auth/login" className="mobile-discord-button">
              <span>{content.signup}</span>
              <DiscordIcon />
            </a>
          )}
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            onClick={() => setIsMenuOpen(false)}
          >
            {content.join} Discord
          </a>
          <LanguageSwitcher locale={locale} />
        </div>
      </div>
    </header>
  );
}
