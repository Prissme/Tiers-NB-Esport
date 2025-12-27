import SectionHeader from "../components/SectionHeader";

const placeholders = [
  { label: "Divisions", value: "à annoncer" },
  { label: "Best-of", value: "à annoncer" },
  { label: "Montée / descente", value: "à annoncer" },
  { label: "Playoffs", value: "à annoncer" },
];

export default function FormatPage() {
  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          title="Format compétitif"
          description="Le format officiel sera publié après validation des inscriptions." 
        />
        <div className="grid gap-4 md:grid-cols-2">
          {placeholders.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {item.label}
              </p>
              <p className="mt-2 text-sm text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-card space-y-4">
        <SectionHeader
          title="Pourquoi attendre"
          description="Le format dépend du nombre d'équipes validées." 
        />
        <p className="text-sm text-slate-200">
          L'annonce officielle évite les changements de dernière minute et protège l'équité.
        </p>
      </section>
    </div>
  );
}
