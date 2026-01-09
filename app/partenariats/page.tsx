import type { Metadata } from "next";
import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";

export const metadata: Metadata = {
  title: "Partenariats",
  description: "Soutenez la LFN et découvrez nos opportunités partenaires.",
};

const partnerBlocks = [
  { label: "Visibilité", detail: "Sobre" },
  { label: "Impact", detail: "Direct" },
  { label: "Contact", detail: "Fluide" },
];

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
            <Button href="/matchs" variant="secondary">
              Voir la ligue
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
