"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "./Button";
import DiscordIcon from "./DiscordIcon";
import LanguageSwitcher from "./LanguageSwitcher";
import type { Locale } from "../lib/i18n";
import ReloadingImage from "./ReloadingImage";

const logoUrl = "/LogoLFN.webp";

const DISCORD_INVITE = "https://discord.gg/q6sFPWCKD7";

const navLinks = {
  fr: [
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Tournois", href: "/tournois" },
    { label: "Règlement", href: "/rulebook" },
  ],
  en: [
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Tournaments", href: "/tournois" },
    { label: "Rulebook", href: "/rulebook" },
  ],
};

const copy = {
  fr: {
    logoAlt: "Logo LFN",
    signup: "S'inscrire",
    join: "Rejoindre",
    openMenu: "Ouvrir le menu",
    tagline: "Ligue Null's Brawl",
    members: "2000 membres",
  },
  en: {
    logoAlt: "LFN logo",
    signup: "Sign up",
    join: "Join",
    openMenu: "Open menu",
    tagline: "Null's Brawl League",
    members: "2000 members",
  },
};

export default function Header({ locale }: { locale: Locale }) {
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
          <Button
            href={DISCORD_INVITE}
            variant="primary"
            external
            ariaLabel={content.signup}
            className="header-cta"
          >
            <span className="flex items-center gap-2">
              {content.signup} <DiscordIcon size={20} />
            </span>
          </Button>
        </div>
        <div className="md:hidden">
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
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            className="mobile-discord-button"
            onClick={() => setIsMenuOpen(false)}
          >
            <span>{content.join}</span>
            <DiscordIcon />
          </a>
          <LanguageSwitcher locale={locale} />
        </div>
      </div>
    </header>
  );
}
