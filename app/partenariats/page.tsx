import type { Metadata } from "next";
import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";

export const metadata: Metadata = {
  title: "Partenariats",
  description: "Soutien LFN et options partenaires.",
};

const partnerBlocks = [
  { label: "Visibilité", detail: "Sobre" },
  { label: "Impact", detail: "Direct" },
  { label: "Contact", detail: "Fluide" },
];

export default function PartenariatsPage() {
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Partenariats"
            title="Soutien partenaire"
            description="Présence claire, formats courts."
            tone="dominant"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {partnerBlocks.map((block) => (
              <div key={block.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-utility">{block.label}</p>
                <p className="mt-3 text-sm text-white">{block.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/matchs" variant="secondary">
              Voir la ligue
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
