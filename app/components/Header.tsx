import Link from "next/link";
import Button from "./Button";

const navItems = [
  { label: "Matchs", href: "/matchs" },
  { label: "Classements", href: "/classement" },
  { label: "Comment participer", href: "/participer" },
  { label: "Équipes", href: "/equipes" },
  { label: "Règlement", href: "/reglement" },
  { label: "Partenariats", href: "/partenariats" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-wide text-white">
          LFN
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button href="/participer" variant="primary">
            Participer
          </Button>
        </div>
      </div>
    </header>
  );
}
