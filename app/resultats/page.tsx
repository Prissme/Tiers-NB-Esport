import SectionHeader from "../components/SectionHeader";
import { getBaseUrl } from "../lib/get-base-url";

type MatchData = {
  id: string;
  scheduledAt: string | null;
  dayLabel: string | null;
  division: string | null;
  scoreA: number | null;
  scoreB: number | null;
  teamA: { name: string };
  teamB: { name: string };
};

const loadResults = async () => {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/site/matches?status=recent&limit=50`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return [] as MatchData[];
  }

  const payload = (await response.json()) as { matches?: MatchData[] };
  return payload.matches ?? [];
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("fr-FR");
};

export default async function ResultatsPage() {
  const matches = await loadResults();
  const resultsByDay = matches.reduce<Record<string, MatchData[]>>((acc, match) => {
    const day = match.dayLabel ?? "Jour";
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(match);
    return acc;
  }, {});

  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-12 top-8 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-4 top-4 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Résultats"
            title="Scores compacts"
            description="Une ligne par match."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(resultsByDay).map(([dayLabel, dayMatches]) => (
              <div key={dayLabel} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{dayLabel}</p>
                <p className="mt-3 text-sm text-white">
                  {dayMatches.length} match{dayMatches.length > 1 ? "s" : ""}
                </p>
                <p className="mt-2 text-xs text-amber-200/80">
                  {dayMatches[0]?.scheduledAt ? formatDate(dayMatches[0].scheduledAt) : "-"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Résultats"
          title="Résultats officiels"
          description="Day 1 & Day 2."
        />
        {matches.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun résultat disponible.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(resultsByDay).map(([dayLabel, dayMatches]) => (
              <div key={dayLabel} className="overflow-hidden rounded-2xl border border-white/10">
                <div className="bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.35em] text-slate-400">
                  {dayLabel}
                </div>
                <ul className="divide-y divide-white/10 text-sm text-slate-200">
                  {dayMatches.map((match) => (
                    <li key={match.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
                      <div>
                        <p className="text-white">
                          {match.teamA.name} {match.scoreA ?? "-"} - {match.scoreB ?? "-"} {match.teamB.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(match.scheduledAt)} · {match.division ?? ""}
                        </p>
                      </div>
                      <span className="text-xs text-amber-300">Validé</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
