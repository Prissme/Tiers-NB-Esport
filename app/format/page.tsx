import SectionHeader from "../components/SectionHeader";
import { getLocale } from "../lib/i18n";

export default function FormatPage() {
  const locale = getLocale();
  const copy = {
    fr: {
      kicker: "Format",
      title: "Règles ultra courtes",
      description: "Tout tient en trois blocs.",
      blocks: [
        { label: "BO5", detail: "Standard" },
        { label: "Points", detail: "3-1-0" },
        { label: "Tie-break", detail: "TB rapide" },
      ],
    },
    en: {
      kicker: "Format",
      title: "Ultra-short rules",
      description: "Everything in three blocks.",
      blocks: [
        { label: "BO5", detail: "Standard" },
        { label: "Points", detail: "3-1-0" },
        { label: "Tie-break", detail: "Quick TB" },
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
            {content.blocks.map((block) => (
              <div key={block.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-utility">{block.label}</p>
                <p className="mt-3 text-sm text-white">{block.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
