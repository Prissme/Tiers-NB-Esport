import type { Metadata } from "next";
import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";
import { getLocale } from "../lib/i18n";

export const metadata: Metadata = {
  title: "Partenariats",
  description: "Soutien LFN et options partenaires.",
};

export default function PartenariatsPage() {
  const locale = getLocale();
  const copy = {
    fr: {
      kicker: "Partenariats",
      title: "Soutien partenaire",
      description: "Présence claire, formats courts.",
      blocks: [
        { label: "Visibilité", detail: "Sobre" },
        { label: "Impact", detail: "Direct" },
        { label: "Contact", detail: "Fluide" },
      ],
      cta: "Voir la ligue",
    },
    en: {
      kicker: "Partnerships",
      title: "Partner support",
      description: "Clear presence, short formats.",
      blocks: [
        { label: "Visibility", detail: "Clean" },
        { label: "Impact", detail: "Direct" },
        { label: "Contact", detail: "Smooth" },
      ],
      cta: "See the league",
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
          <div className="flex flex-wrap gap-3">
            <Button href="/matchs" variant="secondary">
              {content.cta}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
