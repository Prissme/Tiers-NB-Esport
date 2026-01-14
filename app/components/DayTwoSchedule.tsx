import { dayTwoSchedule, teams } from "../../src/data";

const divisionLabels: Record<string, string> = {
  D1: "Division 1",
  D2: "Division 2",
};

const formatTimeLabel = (time: string) => time.replace(":00", "H");

export default function DayTwoSchedule() {
  const teamMap = new Map(teams.map((team) => [team.id, team.name]));

  return (
    <section className="section-card space-y-6">
      <div className="space-y-2">
        <p className="badge">Programme</p>
        <h2 className="text-2xl font-semibold text-white">
          Programme — {dayTwoSchedule.label}
        </h2>
        <p className="text-sm text-slate-300">{dayTwoSchedule.note}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {dayTwoSchedule.slots.map((slot) => (
          <div key={`${slot.time}-${slot.division}`} className="motion-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-200">
                {formatTimeLabel(slot.time)}
              </p>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-200">
                {divisionLabels[slot.division] ?? slot.division}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {slot.matches.map((match) => (
                <span key={`${match.teamAId}-${match.teamBId}`} className="motion-pill">
                  {teamMap.get(match.teamAId) ?? match.teamAId}{" "}
                  <span className="text-amber-200">vs</span>{" "}
                  {teamMap.get(match.teamBId) ?? match.teamBId}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
