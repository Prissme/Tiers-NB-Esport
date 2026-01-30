import SectionHeader from "../components/SectionHeader";
import { getLocale } from "../lib/i18n";

export default function PrizepoolPage() {
  const locale = getLocale();
  const copy = {
    fr: {
      kicker: "Cagnotte",
      title: "Cagnotte lisible",
      description: "Objectif clair, suivi léger.",
      tiles: [
        { label: "Objectif", detail: "Effort léger" },
        { label: "Récompense", detail: "Clair" },
        { label: "Suivi", detail: "Transparence" },
      ],
    },
    en: {
      kicker: "Prize pool",
      title: "Clear prize pool",
      description: "Clear target, light tracking.",
      tiles: [
        { label: "Goal", detail: "Light effort" },
        { label: "Reward", detail: "Clear" },
        { label: "Tracking", detail: "Transparency" },
      ],
    },
  };
  const content = copy[locale];
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker={content.kicker}
            title={content.title}
            description={content.description}
            tone="dominant"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {content.tiles.map((tile) => (
              <div key={tile.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-utility">{tile.label}</p>
                <p className="mt-3 text-sm text-white">{tile.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
