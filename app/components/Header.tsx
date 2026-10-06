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
    tagline: "Ligue Null's Brawl",
    members: "2000 membres",
  },
  en: {
    logoAlt: "LFN logo",
    signup: "Sign up",
    logout: "Log out",
    join: "Join",
    openMenu: "Open menu",
    tagline: "Null's Brawl League",
    members: "2000 members",
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
            <span className="header-wordmark">
              <span className="header-wordmark__title">LFN</span>
              <span className="header-wordmark__tagline">{content.tagline}</span>
            </span>
          </Link>
          <span className="header-divider hidden md:block" aria-hidden="true" />
          <nav className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`nav-link ${isActive(link.href) ? "is-active" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="header-right hidden md:flex">
          <span className="header-members">
            <span className="header-members__dot" aria-hidden="true" />
            {content.members}
          </span>
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
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <span className="max-w-[140px] truncate">{user.name}</span>
              </span>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="text-xs uppercase tracking-[0.12em] text-[color:var(--color-text-faint)] transition hover:text-[color:var(--color-text)]"
                >
                  {content.logout}
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
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
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
