import Link from "next/link";
import Button from "./Button";
import type { LfnLinks } from "../lib/types";

const navItems = [
  { label: "Format", href: "/format" },
  { label: "Calendrier", href: "/calendrier" },
  { label: "Résultats", href: "/resultats" },
  { label: "Classement", href: "/classement" },
  { label: "Équipes", href: "/equipes" },
  { label: "Règlement", href: "/reglement" },
];

type HeaderProps = {
  links: LfnLinks;
};

export default function Header({ links }: HeaderProps) {
  const discordLink = links.discord || "#";
  const discordDisabled = !links.discord;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-wide text-white">
          LFN League Hub
        </Link>
        <nav className="hidden flex-wrap items-center gap-4 text-sm text-slate-200 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button href="/inscription" variant="secondary">
            S'inscrire
          </Button>
          <Button
            href={discordLink}
            external
            variant="primary"
            disabled={discordDisabled}
          >
            {discordDisabled ? "Discord (à annoncer)" : "Rejoindre le Discord"}
          </Button>
        </div>
      </div>
    </header>
  );
}
