import SectionHeader from "../components/SectionHeader";
import { getLocale } from "../lib/i18n";

export default function CalendrierPage() {
  const locale = getLocale();
  const copy = {
    fr: {
      kicker: "Calendrier",
      title: "Planning condensé",
      description: "Juste les blocs clés.",
      tiles: [
        { label: "Semaine 1", detail: "Bloc court" },
        { label: "Semaine 2", detail: "Bloc rapide" },
        { label: "Semaine 3", detail: "Bloc final" },
      ],
    },
    en: {
      kicker: "Calendar",
      title: "Condensed schedule",
      description: "Just the key blocks.",
      tiles: [
        { label: "Week 1", detail: "Short block" },
        { label: "Week 2", detail: "Fast block" },
        { label: "Week 3", detail: "Final block" },
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
