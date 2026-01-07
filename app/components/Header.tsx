import Link from "next/link";
import Button from "./Button";

const navItems = [
  { label: "Matchs", href: "/matchs" },
  { label: "Équipes", href: "/equipes" },
  { label: "Règlement", href: "/reglement" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold">
            LFN
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300/80">
              Ligue officielle
            </p>
            <p className="text-xs text-slate-400">Null&apos;s Brawl Francophone</p>
          </div>
        </Link>
        <nav className="hidden flex-wrap items-center gap-4 text-sm text-slate-200 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-transparent px-3 py-1 transition hover:border-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <iframe
            title="Discord Prissme TV"
            src="https://discord.com/widget?id=1236724293027496047&theme=dark"
            width="350"
            height="500"
            allowTransparency={true}
            frameBorder="0"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            className="rounded-2xl border border-white/10 bg-white/5"
          />
          <Button href="https://ko-fi.com/prissme" variant="ghost" external>
            Soutenir la LFN
          </Button>
        </div>
      </div>
    </header>
  );
}
