import { matches, teams } from "../../src/data";

const formatScoreLine = (scoreA?: number, scoreB?: number) => {
  if (typeof scoreA !== "number" || typeof scoreB !== "number") return "—";
  return `${scoreA} - ${scoreB}`;
};

export default function DayOneResults() {
  const teamMap = new Map(teams.map((team) => [team.id, team.name]));
  const dayOneResults = matches
    .filter((match) => match.status === "finished" && match.dayLabel === "Day 1")
    .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());

  return (
    <section className="section-card space-y-6">
      <div className="space-y-2">
        <p className="badge">Résultats</p>
        <h2 className="text-2xl font-semibold text-white">Résultats — Day 1</h2>
      </div>

      {dayOneResults.length === 0 ? (
        <p className="text-sm text-slate-300">Aucun résultat disponible.</p>
      ) : (
        <div className="grid gap-3">
          {dayOneResults.map((match) => (
            <div key={match.id} className="motion-card flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-white">
                {teamMap.get(match.teamAId) ?? match.teamAId}{" "}
                <span className="text-amber-200">{formatScoreLine(match.scoreA, match.scoreB)}</span>{" "}
                {teamMap.get(match.teamBId) ?? match.teamBId}
              </p>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {match.division}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
