import { getLatestResult, getNextMatch, meta, teamMap } from "./lib/lfn-data";

const ctas = [
  { label: "View Schedule", href: "/schedule" },
  { label: "Read Rulebook", href: "/rulebook" },
  { label: "Meet the Teams", href: "/teams" },
];

const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
};

export default function Home() {
  const nextMatch = getNextMatch();
  const latestResult = getLatestResult();
  const homeTeam = teamMap.get(nextMatch.teamAId);
  const awayTeam = teamMap.get(nextMatch.teamBId);
  const latestHome = latestResult?.match
    ? teamMap.get(latestResult.match.teamAId)
    : null;
  const latestAway = latestResult?.match
    ? teamMap.get(latestResult.match.teamBId)
    : null;

  return (
    <div className="space-y-10">
      <section className="glass-panel relative overflow-hidden p-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-pulse/20 blur-3xl" />
        <div className="relative space-y-5">
          <p className="text-sm uppercase tracking-[0.35em] text-frost">
            {meta.seasonName} · {meta.year}
          </p>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">
            LFN League Hub
          </h1>
          <p className="text-lg italic text-frost md:text-xl">
            {meta.signatureLine}
          </p>
          <p className="max-w-2xl text-base text-frost">
            The centralized league hub for matchdays, rosters, and standings.
            Everything you need stays updated in a single scroll.
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
          <h2 className="section-title">Live Proof</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-[1fr,auto,1fr] md:items-center">
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-frost">
                Team A
              </p>
              <p className="text-2xl font-semibold text-white">
                {homeTeam?.name}
              </p>
              <p className="text-sm text-frost">{homeTeam?.tag}</p>
            </div>
            <div className="flex flex-col items-center gap-2 text-sm text-frost">
              <span className="rounded-full border border-white/10 px-3 py-1">
                Next Match
              </span>
              <span>vs</span>
              {nextMatch.extraLine ? (
                <span className="text-xs uppercase tracking-[0.2em] text-frost">
                  {nextMatch.extraLine}
                </span>
              ) : null}
            </div>
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-frost">
                Team B
              </p>
              <p className="text-2xl font-semibold text-white">
                {awayTeam?.name}
              </p>
              <p className="text-sm text-frost">{awayTeam?.tag}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-frost">
            <div>
              <p className="font-semibold text-white">Matchday</p>
              <p>
                {nextMatch.dayLabel}
                {nextMatch.date ? ` · ${nextMatch.date}` : ""}
              </p>
            </div>
            <div>
              <p className="font-semibold text-white">Start Time</p>
              <p>{nextMatch.time} UTC</p>
            </div>
            <a
              href={meta.discordInviteUrl}
              className="rounded-full border border-pulse/40 bg-pulse/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pulse/40"
            >
              Join Discord
            </a>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-frost">
                Last updated
              </p>
              <p className="mt-2 text-sm text-white">
                {formatDateTime(meta.lastUpdatedISO)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-frost">
                Latest result
              </p>
              {latestResult && latestHome && latestAway ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white">
                  <span>
                    {latestHome.name} {latestResult.scoreA}
                  </span>
                  <span className="text-frost">-</span>
                  <span>
                    {latestResult.scoreB} {latestAway.name}
                  </span>
                  <span className="text-xs text-frost">
                    ({formatDateTime(latestResult.reportedAtISO)})
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-frost">
                  Awaiting the first reported score.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="glass-panel flex flex-col justify-between gap-6 p-6">
          <div>
            <h2 className="section-title">League Snapshot</h2>
            <ul className="mt-4 space-y-3 text-sm text-frost">
              <li>
                <span className="text-white">Season:</span> {meta.seasonName}
              </li>
              <li>
                <span className="text-white">Teams:</span> 10 active squads
              </li>
              <li>
                <span className="text-white">Format:</span> Best-of-three
              </li>
              <li>
                <span className="text-white">Broadcast:</span> Twitch + Discord
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-frost">
            <p className="text-white">Tip</p>
            <p className="mt-2">
              Use the standings page to sort by points or set differential for
              instant tie-break clarity.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
