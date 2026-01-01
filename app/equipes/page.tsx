import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";
import TeamCard from "./TeamCard";
import { getBaseUrl } from "../lib/get-base-url";

const teamTiles = [
  { label: "D1", detail: "Élite" },
  { label: "D2", detail: "Challengers" },
  { label: "Rosters", detail: "Visibles" },
];

const teamTags = ["Roster", "Logo", "Stats", "Clip"];

type TeamResponse = {
  teams: Array<{
    id: string;
    name: string;
    tag: string | null;
    division: string | null;
    logoUrl: string | null;
    wins: number | null;
    losses: number | null;
    points: number | null;
  }>;
};

const loadTeams = async (): Promise<TeamResponse> => {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/site/teams`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return { teams: [] };
  }

  return response.json();
};

export default async function EquipesPage() {
  const { teams } = await loadTeams();

  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-12 top-8 h-52 w-52 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-4 h-56 w-56 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Équipes"
            title="Rosters lisibles"
            description="Cartes courtes, infos rapides."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {teamTiles.map((tile) => (
              <div key={tile.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{tile.label}</p>
                <p className="mt-3 text-sm text-white">{tile.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/inscription" variant="primary">
              Inscrire
            </Button>
            <Button href="/classement" variant="secondary">
              Classement
            </Button>
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader kicker="Équipes" title="Rosters actifs" description="Données en direct." />
        {teams.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune équipe enregistrée.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader kicker="Repères" title="Tags essentiels" description="Rien de lourd." />
        <div className="flex flex-wrap gap-3">
          {teamTags.map((tag) => (
            <span key={tag} className="motion-pill">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Identité</p>
            <p className="mt-3 text-sm text-white">Visuel clair.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Rôle</p>
            <p className="mt-3 text-sm text-white">Place rapide.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
