import Link from "next/link";
import Countdown from "./Countdown";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
        <Link href="/" className="flex items-center gap-4 text-white">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/10 p-2 shadow-[0_0_35px_rgba(234,179,8,0.2)] sm:h-24 sm:w-24">
            <img
              src="https://cdn.discordapp.com/attachments/1434252768633290952/1458818973847261380/image-Photoroom.png?ex=6961068a&is=695fb50a&hm=4a419d5d0a39c377943e81a9997f7b9361e4a697a0e8ee2ecbe0845c0b8e8c87&"
              alt="Logo LFN"
              className="h-full w-full object-contain"
            />
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">
              Ligue officielle
            </p>
            <p className="text-xs text-slate-400">Null&apos;s Brawl Francophone</p>
          </div>
        </Link>
        <div className="flex w-full justify-center sm:w-auto">
          <Countdown
            targetDate="2026-01-12T18:00:00+01:00"
            className="neo-border glow-pulse"
          />
        </div>
      </div>
    </header>
  );
}
