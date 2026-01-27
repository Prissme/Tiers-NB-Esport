import Link from "next/link";
import Button from "./Button";

const logoUrl =
  "https://cdn.discordapp.com/attachments/1434252768633290952/1465784436863009039/content.png?ex=697a5da2&is=69790c22&hm=a083df280ac73a6d78e669f8deb73358115f3df1547087e7ec6453fa96e3fc9e";

const INSCRIPTION_PATH = "/inscription";

const navLinks = [
  { label: "Règles", href: "/reglement" },
  { label: "Classement", href: "/classement" },
  { label: "S’inscrire", href: INSCRIPTION_PATH },
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
        </nav>
        <div className="md:hidden">
          <Button href={INSCRIPTION_PATH} variant="secondary" ariaLabel="S'inscrire à la ligue">
            S&apos;inscrire
          </Button>
        </div>
      </div>
    </header>
  );
}
