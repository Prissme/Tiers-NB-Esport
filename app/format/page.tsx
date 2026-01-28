import SectionHeader from "../components/SectionHeader";

const formatBlocks = [
  { label: "BO5", detail: "Standard" },
  { label: "Points", detail: "3-1-0" },
  { label: "Tie-break", detail: "TB rapide" },
];

export default function FormatPage() {
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Format"
            title="Règles ultra courtes"
            description="Tout tient en trois blocs."
            tone="dominant"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {formatBlocks.map((block) => (
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
