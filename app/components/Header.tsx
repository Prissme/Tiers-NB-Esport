"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "./Button";
import DiscordIcon from "./DiscordIcon";

const logoUrl =
  "https://media.discordapp.net/attachments/1434252768633290952/1465789599056920798/image-Photoroom_9.png?ex=697a6271&is=697910f1&hm=e0990ddef7862a837e2984eecdecde04b6417c436bd5e522b7b09b27a346f18e&=&format=webp&quality=lossless&width=692&height=692";

const INSCRIPTION_PATH = "/inscription";

const navLinks = [
  { label: "Matches", href: "/matchs" },
  { label: "Classement", href: "/classement" },
  { label: "Programme", href: "/matches" },
  { label: "Règlement", href: "/reglement" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="relative z-20">
      <div className="header-shell">
        <Link href="/" className="flex items-center gap-3 text-[color:var(--color-text)]">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden">
            <img
              src={logoUrl}
              alt="Logo LFN"
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </span>
          <div className="hidden sm:block">
            <p className="font-sekuya text-[11px] uppercase tracking-[0.45em] text-[color:var(--color-text-muted)]">
              Ligue francophone
            </p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) =>
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
          <Button href={INSCRIPTION_PATH} variant="secondary" ariaLabel="S'inscrire">
            <span className="flex items-center gap-2">
              S&apos;inscrire <DiscordIcon />
            </span>
          </Button>
        </nav>
        <div className="md:hidden">
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-expanded={isMenuOpen}
            aria-label="Ouvrir le menu"
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
          {navLinks.map((link) =>
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
            <span>Rejoindre</span>
            <DiscordIcon />
          </Link>
        </div>
      </div>
    </header>
  );
}
