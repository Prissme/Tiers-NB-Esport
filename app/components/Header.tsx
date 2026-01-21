import Link from "next/link";
import Button from "./Button";

const navLinks = [
  { label: "Calendrier", href: "/matchs" },
  { label: "Classement", href: "/classement" },
  { label: "Équipes", href: "/equipes" },
];

export default function Header() {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-base font-semibold tracking-[0.2em]">
            LFN
          </span>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              League Force Network
            </p>
            <p className="text-sm text-slate-300">The Elite League</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.3em] text-slate-300 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12]"
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
