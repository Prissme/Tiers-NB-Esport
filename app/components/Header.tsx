import Link from "next/link";
import Button from "./Button";
import Countdown from "./Countdown";

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
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 p-1">
            <img
              src="https://media.discordapp.net/attachments/1434252768633290952/1458528708120940686/image-Photoroom_1.png?ex=695ff836&is=695ea6b6&hm=a746f26711c62f9e67af9450f64fd1727801e0de5d5e325154afec473340a464&=&format=webp&quality=lossless&width=771&height=514"
              alt="Logo LFN"
              className="h-full w-full object-contain"
            />
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-fuchsia-300/80">
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
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Countdown targetDate="2026-01-12T18:00:00+01:00" />
          <Button href="https://ko-fi.com/prissme" variant="ghost" external>
            Soutenir la LFN
          </Button>
        </div>
      </div>
    </header>
  );
}
