import { teams } from "../lib/lfn-data";

export default function TeamsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-frost">
          League Rosters
        </p>
        <h1 className="text-4xl font-semibold text-white">Teams</h1>
        <p className="text-frost">
          Jump to a squad or scroll the full roster lineup.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        {teams.map((team) => (
          <a
            key={team.id}
            href={`#${team.id}`}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-semibold text-white transition hover:border-white/30"
          >
            {team.logo} {team.name}
          </a>
        ))}
      </div>

      <div className="space-y-6">
        {teams.map((team) => (
          <section key={team.id} id={team.id} className="glass-panel p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl">
                  {team.logo}
                </div>
                <div>
                  <h2 className="section-title">{team.name}</h2>
                  <p className="text-sm text-frost">
                    Tag: {team.tag} · {team.roster.length} players
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-white/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-frost">
                {team.colors[0]}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {team.roster.map((player) => (
                <div
                  key={player.name}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-lg font-semibold text-white">
                    {player.name}
                  </p>
                  <p className="text-sm text-frost">{player.role}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
