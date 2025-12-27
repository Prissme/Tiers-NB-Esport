import { schedule, teamMap } from "../lib/lfn-data";

export default function SchedulePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-frost">
          Match Calendar
        </p>
        <h1 className="text-4xl font-semibold text-white">Schedule</h1>
        <p className="text-frost">
          Weekly schedule grouped by day. Times listed in UTC.
        </p>
      </header>

      <div className="space-y-6">
        {schedule.map((day) => (
          <section key={day.dayLabel} className="glass-panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title">{day.dayLabel}</h2>
              {day.date ? (
                <span className="text-sm text-frost">{day.date}</span>
              ) : null}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm text-frost">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-[0.2em] text-white">
                    <th className="py-3">Time (UTC)</th>
                    <th className="py-3">Match</th>
                    <th className="py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {day.matches.map((match) => {
                    const teamA = teamMap.get(match.teamAId);
                    const teamB = teamMap.get(match.teamBId);
                    return (
                      <tr key={match.id} className="border-b border-white/5">
                        <td className="py-3">{match.time}</td>
                        <td className="py-3 text-white">
                          {teamA?.name} vs {teamB?.name}
                        </td>
                        <td className="py-3">
                          {match.extraLine ? (
                            <span className="text-xs uppercase tracking-[0.2em] text-frost">
                              {match.extraLine}
                            </span>
                          ) : (
                            <span className="text-xs text-frost">Standard Bo3</span>
                          )}
                        </td>
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
