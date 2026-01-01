import SectionHeader from "../components/SectionHeader";
import { getBaseUrl } from "../lib/get-base-url";

const matchPanels = [
  { label: "Prévu", detail: "Slots rapides" },
  { label: "Live", detail: "Focus instantané" },
  { label: "Terminé", detail: "Score court" },
];

const matchTags = ["D1", "D2", "BO5", "Playoffs"];

type MatchData = {
  id: string;
  status: string | null;
  scheduledAt: string | null;
  bestOf: number | null;
  scoreA: number | null;
  scoreB: number | null;
  division: string | null;
  teamA: { name: string; tag: string | null };
  teamB: { name: string; tag: string | null };
};

const loadMatches = async (status: "live" | "recent") => {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/site/matches?status=${status}&limit=10`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return [] as MatchData[];
  }

  const payload = (await response.json()) as { matches?: MatchData[] };
  return payload.matches ?? [];
};

export default async function MatchsPage() {
  const [liveMatches, recentMatches] = await Promise.all([
    loadMatches("live"),
    loadMatches("recent"),
  ]);

  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-12 top-10 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-4 top-4 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Matchs"
            title="Planning condensé"
            description="Tout est visuel, rien de lourd."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {matchPanels.map((panel) => (
              <div key={panel.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{panel.label}</p>
                <p className="mt-3 text-sm text-white">{panel.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="En cours"
          title="Matchs live"
          description="Suivi en temps réel."
        />
        {liveMatches.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun match en cours.</p>
        ) : (
          <div className="space-y-3">
            {liveMatches.map((match) => (
              <div
                key={match.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div>
                  <p className="text-sm text-white">
                    {match.teamA.name} vs {match.teamB.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {match.scheduledAt || "À venir"} · {match.division ?? ""}
                  </p>
                </div>
                <div className="text-xs text-emerald-300">{match.status ?? "Live"}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Récents"
          title="Derniers scores"
          description="Résultats validés."
        />
        {recentMatches.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun match récent.</p>
        ) : (
          <div className="space-y-3">
            {recentMatches.map((match) => (
              <div
                key={match.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div>
                  <p className="text-sm text-white">
                    {match.teamA.name} {match.scoreA ?? "-"} - {match.scoreB ?? "-"} {match.teamB.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {match.scheduledAt || ""} · {match.division ?? ""}
                  </p>
                </div>
                <div className="text-xs text-slate-300">BO{match.bestOf ?? "-"}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader kicker="Tags" title="Repères rapides" description="Quelques labels suffisent." />
        <div className="flex flex-wrap gap-3">
          {matchTags.map((tag) => (
            <span key={tag} className="motion-pill">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Timing</p>
            <p className="mt-3 text-sm text-white">Créneaux courts.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Score</p>
            <p className="mt-3 text-sm text-white">Affichage clair.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
