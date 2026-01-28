export default function Footer() {
  return (
    <footer className="relative z-10 bg-[#070a12]/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-10 text-sm text-slate-400 sm:px-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xs font-semibold tracking-[0.25em]">
              LFN
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-slate-500">
                Ligue francophone
              </p>
              <p className="text-sm text-slate-300">Ligue officielle</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} LFN. Tous droits réservés.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.3em]">
          <a
            href="/reglement"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12]"
          >
            Règlement
          </a>
          <a
            href="/matchs"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12]"
          >
            Matchs
          </a>
          <a
            href="/classement"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12]"
          >
            Classement
          </a>
        </div>
      </div>
    </footer>
  );
}
