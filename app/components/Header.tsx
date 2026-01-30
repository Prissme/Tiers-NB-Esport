"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "./Button";
import DiscordIcon from "./DiscordIcon";
import LanguageSwitcher from "./LanguageSwitcher";
import type { Locale } from "../lib/i18n";
import ReloadingImage from "./ReloadingImage";

const logoUrl =
  "https://media.discordapp.net/attachments/1434252768633290952/1466093575224819904/image-Photoroom_12.png?ex=697e208b&is=697ccf0b&hm=e4e4f3b232300dacbd0adae61a9c2bfcbd044a1e6d3130b152eb67641b42f047&=&format=webp&quality=lossless&width=331&height=325";

const INSCRIPTION_PATH = "/inscription";

const navLinks = {
  fr: [
    { label: "Matchs", href: "/matchs" },
    { label: "Classement", href: "/classement" },
    { label: "Règlement", href: "/reglement" },
  ],
  en: [
    { label: "Matches", href: "/matchs" },
    { label: "Standings", href: "/classement" },
    { label: "Rules", href: "/reglement" },
  ],
};

const copy = {
  fr: {
    logoAlt: "Logo LFN",
    signup: "S'inscrire",
    join: "Rejoindre",
    openMenu: "Ouvrir le menu",
  },
  en: {
    logoAlt: "LFN logo",
    signup: "Sign up",
    join: "Join",
    openMenu: "Open menu",
  },
};

export default function Header({ locale }: { locale: Locale }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const content = copy[locale];
  const links = navLinks[locale];

  return (
    <header className="relative z-20">
      <div className="header-shell">
        <Link href="/" className="flex items-center gap-3 text-[color:var(--color-text)]">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden">
            <ReloadingImage
              src={logoUrl}
              alt={content.logoAlt}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="nav-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)]"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)]"
              >
                {link.label}
              </Link>
            )
          )}
          <Button
            href={INSCRIPTION_PATH}
            variant="secondary"
            ariaLabel={content.signup}
            className="discord-cta"
          >
            <span className="flex items-center gap-2">
              {content.signup} <DiscordIcon />
            </span>
          </Button>
          <LanguageSwitcher locale={locale} />
        </nav>
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
          <Link
            href={INSCRIPTION_PATH}
            className="mobile-discord-button"
            onClick={() => setIsMenuOpen(false)}
          >
            <span>{content.join}</span>
            <DiscordIcon />
          </Link>
          <LanguageSwitcher locale={locale} />
        </div>
      </div>
    </header>
  );
}
