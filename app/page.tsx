import Button from "./components/Button";
import SectionHeader from "./components/SectionHeader";
import { getBaseUrl } from "./lib/get-base-url";

const motionCards = [
  { title: "Matches", detail: "Plus de 30 matchs joués" },
  { title: "Scores", detail: "Validation rapide" },
  { title: "Teams", detail: "Rosters visibles" },
  { title: "Règles", detail: "Formats clairs" },
];

type SiteStats = {
  playersCount: number | null;
  matchesToday: number | null;
  prizepoolTotal: number | null;
};

const loadStats = async (): Promise<SiteStats> => {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/site/stats`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return { playersCount: null, matchesToday: null, prizepoolTotal: null };
  }

  return response.json();
};

export default async function HomePage() {
  const stats = await loadStats();

  return (
    <div className="space-y-12">
      <section className="motion-field p-8 md:p-10">
        <div className="motion-orb -left-20 top-10 h-56 w-56 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-0 h-64 w-64 motion-spin" />
        <div className="motion-orb motion-orb--pink bottom-[-80px] left-1/3 h-72 w-72 motion-drift" />
        <div className="absolute inset-0 grid-lines opacity-30" />
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-300/80">
              LFN / Null&apos;s Brawl
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
              LFN, le futur de l&apos;e-sport Null&apos;s Brawl
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/matchs" variant="secondary">
              Matchs
            </Button>
          </div>
        </div>
        <div className="relative z-10 mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {motionCards.map((card) => (
            <div key={card.title} className="motion-card motion-shimmer">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                {card.title}
              </p>
              <p className="mt-3 text-sm text-white">{card.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Live"
          title="Instantané"
          description="Les chiffres clés de la ligue."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Joueurs</p>
            <p className="mt-3 text-2xl font-semibold text-white">{stats.playersCount ?? "-"}</p>
            <p className="text-xs text-slate-400">Inscrits actifs</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Matchs</p>
            <p className="mt-3 text-2xl font-semibold text-white">{stats.matchesToday ?? "-"}</p>
            <p className="text-xs text-slate-400">Aujourd&apos;hui</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Prizepool</p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {stats.prizepoolTotal ?? "-"}
            </p>
            <p className="text-xs text-slate-400">Total actuel</p>
          </div>
        </div>
      </section>
    </div>
  );
}
