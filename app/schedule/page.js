import { groupMatchesByDay, teamMap } from "../lib/lfn-data";

export default function SchedulePage() {
  const groupedMatches = groupMatchesByDay();

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-frost">
          Match Calendar
        </p>
        <h1 className="text-4xl font-semibold text-white">Schedule</h1>
        <p className="text-frost">
          Organized by matchday so you can plan every watch party.
        </p>
      </header>

      <div className="space-y-6">
        {Object.entries(groupedMatches).map(([day, matches]) => (
          <section key={day} className="glass-panel p-6">
            <h2 className="section-title">{day}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm text-frost">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-[0.2em] text-white">
                    <th className="py-3">Time (UTC)</th>
                    <th className="py-3">Match</th>
                    <th className="py-3">Format</th>
                    <th className="py-3">Map</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => {
                    const home = teamMap.get(match.home);
                    const away = teamMap.get(match.away);
                    return (
                      <tr key={match.id} className="border-b border-white/5">
                        <td className="py-3">{match.time}</td>
                        <td className="py-3 text-white">
                          {home.logo} {home.name} vs {away.name} {away.logo}
                        </td>
                        <td className="py-3">{match.format}</td>
                        <td className="py-3">{match.map}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
