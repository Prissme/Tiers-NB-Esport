import Link from "next/link";
import Button from "./Button";

const logoUrl =
  "https://media.discordapp.net/attachments/1434252768633290952/1464582944872992859/image-Photoroom_3.png?ex=6975fea8&is=6974ad28&hm=66eb253822f4e65bad50bbf733b22df75df4c5c4ae87c757b9506c420ac71dc7&=&format=webp&quality=lossless&width=692&height=692";

const navLinks = [
  { label: "Saison 01", href: "/saison-01" },
  { label: "Règles", href: "/regles" },
  { label: "Classement", href: "/classement" },
  { label: "ELITE", href: "/#elite" },
  {
    label: "S’inscrire à la LFN",
    href: "https://discord.gg/prissme",
    external: true,
  },
];

export default function Header() {
  return (
    <header className="relative z-20">
      <div className="header-shell">
        <Link href="/" className="flex items-center gap-3 text-[color:var(--color-text)]">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[color:var(--color-border)]">
            <img
              src={logoUrl}
              alt="Logo LFN"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </span>
          <div className="hidden sm:block">
            <p className="text-[11px] uppercase tracking-[0.45em] text-[color:var(--color-text-muted)]">
              League Force Network
            </p>
            <p className="text-xs text-[color:var(--color-text-muted)]">Institutional League</p>
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
        </nav>
        <div className="md:hidden">
          <Button
            href="https://discord.gg/prissme"
            variant="secondary"
            external
            ariaLabel="S'inscrire à la LFN sur Discord (nouvel onglet)"
          >
            S&apos;inscrire à la LFN
          </Button>
        </div>
      </div>
    </header>
  );
}
