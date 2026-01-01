import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";

const teamTiles = [
  { label: "D1", detail: "Élite" },
  { label: "D2", detail: "Challengers" },
  { label: "Rosters", detail: "Visibles" },
];

const teamTags = ["Roster", "Logo", "Stats", "Clip"];

export default function EquipesPage() {
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
        <SectionHeader
          kicker="Repères"
          title="Tags essentiels"
          description="Rien de lourd."
        />
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
