import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";

const partnerBlocks = [
  { label: "Visibilité", detail: "Sobre" },
  { label: "Impact", detail: "Direct" },
  { label: "Contact", detail: "Fluide" },
];

const partnerTags = ["Overlay", "Clip", "Annonce", "Badge"];

export default function PartenariatsPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-12 top-8 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-2 top-4 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Partenariats"
            title="Soutiens compacts"
            description="Présence claire, pas de surcharge."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {partnerBlocks.map((block) => (
              <div key={block.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{block.label}</p>
                <p className="mt-3 text-sm text-white">{block.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/participer" variant="primary">
              Devenir partenaire
            </Button>
            <Button href="/matchs" variant="secondary">
              Voir la ligue
            </Button>
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Tags"
          title="Repères rapides"
          description="Simple et visuel."
        />
        <div className="flex flex-wrap gap-3">
          {partnerTags.map((tag) => (
            <span key={tag} className="motion-pill">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Pitch</p>
            <p className="mt-3 text-sm text-white">Plan court.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Activation</p>
            <p className="mt-3 text-sm text-white">Cadence claire.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
