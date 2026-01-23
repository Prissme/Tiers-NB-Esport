import Link from "next/link";
import Button from "./Button";

const navLinks = [
  { label: "Saison 01", href: "/saison-01" },
  { label: "Règles", href: "/regles" },
  { label: "Classement", href: "/classement" },
];

export default function Header() {
  return (
    <header className="relative z-20">
      <div className="header-shell">
        <Link href="/" className="flex items-center gap-3 text-[color:var(--color-text)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--color-border)] text-xs font-semibold uppercase tracking-[0.3em]">
            LFN
          </span>
          <div className="hidden sm:block">
            <p className="text-[11px] uppercase tracking-[0.45em] text-[color:var(--color-text-muted)]">
              League Force Network
            </p>
            <p className="text-xs text-[color:var(--color-text-muted)]">Institutional League</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)]"
            >
              {link.label}
            </Link>
          ))}
          <Button href="/participer" variant="secondary">
            S&apos;inscrire
          </Button>
        </nav>
        <div className="md:hidden">
          <Button href="/participer" variant="secondary">
            S&apos;inscrire
          </Button>
        </div>
      </div>
    </header>
  );
}
