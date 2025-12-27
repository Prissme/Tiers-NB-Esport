import { teams } from "../lib/lfn-data";

const getInitials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

const renderRosterGroup = (label, players) => (
  <div className="space-y-2">
    <p className="text-xs uppercase tracking-[0.2em] text-frost">{label}</p>
    <div className="flex flex-wrap gap-2 text-sm text-white">
      {players.length ? (
        players.map((player) => (
          <span
            key={player}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1"
          >
            {player}
          </span>
        ))
      ) : (
        <span className="text-frost">None listed</span>
      )}
    </div>
  </div>
);

export default function TeamsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-frost">
          League Rosters
        </p>
        <h1 className="text-4xl font-semibold text-white">Teams</h1>
        <p className="text-frost">
          All active teams with captains, starters, and subs.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        {teams.map((team) => (
          <a
            key={team.id}
            href={`#${team.id}`}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-semibold text-white transition hover:border-white/30"
          >
            {team.name}
          </a>
        ))}
      </div>

      <div className="space-y-6">
        {teams.map((team) => {
          const rosterCount =
            1 + team.roster.players.length + team.roster.subs.length;
          return (
            <section key={team.id} id={team.id} className="glass-panel p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  {team.logoUrl ? (
                    <img
                      src={team.logoUrl}
                      alt={`${team.name} logo`}
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white">
                      {getInitials(team.name)}
                    </div>
                  )}
                  <div>
                    <h2 className="section-title">{team.name}</h2>
                    <p className="text-sm text-frost">
                      Tag: {team.tag} · {rosterCount} listed
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-frost">
                  Captain: {team.roster.captain}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {renderRosterGroup("Captain", [team.roster.captain])}
                {renderRosterGroup("Starters", team.roster.players)}
                {renderRosterGroup("Subs", team.roster.subs)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
