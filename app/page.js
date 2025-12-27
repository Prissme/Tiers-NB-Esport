import { getNextMatch, league, teamMap } from "./lib/lfn-data";

const ctas = [
  { label: "View Schedule", href: "/schedule" },
  { label: "Read Rulebook", href: "/rulebook" },
  { label: "Meet the Teams", href: "/teams" },
];

export default function Home() {
  const nextMatch = getNextMatch();
  const homeTeam = teamMap.get(nextMatch.home);
  const awayTeam = teamMap.get(nextMatch.away);

  return (
    <div className="space-y-10">
      <section className="glass-panel relative overflow-hidden p-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-pulse/20 blur-3xl" />
        <div className="relative space-y-5">
          <p className="text-sm uppercase tracking-[0.35em] text-frost">
            {league.season} · {league.location}
          </p>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">
            {league.fullName}
          </h1>
          <p className="max-w-2xl text-base text-frost">
            The fastest way to catch every match, update, and roster move across
            the LFN ecosystem. Built for a mobile-first, always-on fan
            experience.
          </p>
          <div className="flex flex-wrap gap-3">
            {ctas.map((cta) => (
              <a
                key={cta.href}
                href={cta.href}
                className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/20"
              >
                {cta.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="glass-panel p-6">
          <h2 className="section-title">Next Match</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-[1fr,auto,1fr] md:items-center">
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-frost">
                Home
              </p>
              <p className="text-2xl font-semibold text-white">
                {homeTeam.logo} {homeTeam.name}
              </p>
              <p className="text-sm text-frost">{homeTeam.tag}</p>
            </div>
            <div className="flex flex-col items-center gap-2 text-sm text-frost">
              <span className="rounded-full border border-white/10 px-3 py-1">
                {nextMatch.format}
              </span>
              <span>vs</span>
              <span className="text-xs uppercase tracking-[0.2em]">
                {nextMatch.map}
              </span>
            </div>
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-frost">
                Away
              </p>
              <p className="text-2xl font-semibold text-white">
                {awayTeam.name} {awayTeam.logo}
              </p>
              <p className="text-sm text-frost">{awayTeam.tag}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-frost">
            <div>
              <p className="font-semibold text-white">Matchday</p>
              <p>{nextMatch.day}</p>
            </div>
            <div>
              <p className="font-semibold text-white">Start Time</p>
              <p>
                {nextMatch.date} · {nextMatch.time} UTC
              </p>
            </div>
            <a
              href={league.website}
              className="rounded-full border border-pulse/40 bg-pulse/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pulse/40"
            >
              Watch Live
            </a>
          </div>
        </div>

        <div className="glass-panel flex flex-col justify-between gap-6 p-6">
          <div>
            <h2 className="section-title">League Snapshot</h2>
            <ul className="mt-4 space-y-3 text-sm text-frost">
              <li>
                <span className="text-white">Mode:</span> {league.mode}
              </li>
              <li>
                <span className="text-white">Broadcast:</span>{" "}
                {league.broadcast}
              </li>
              <li>
                <span className="text-white">Teams:</span> 6 elite squads
              </li>
              <li>
                <span className="text-white">Format:</span> Double round robin
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-frost">
            <p className="text-white">Tip</p>
            <p className="mt-2">
              Follow the standings live and sort by match differential to see
              who is peaking.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
