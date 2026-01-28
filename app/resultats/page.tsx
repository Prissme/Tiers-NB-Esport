import SectionHeader from "../components/SectionHeader";

export default function ResultatsPage() {
  return (
    <div className="space-y-12">
      <section className="surface-dominant">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Résultats"
            title="Résultats officiels"
            description="Résultats non publics."
          />
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Information"
          title="Publication officielle"
          description="Scores publiés après validation."
        />
        <p className="text-sm text-slate-400">
          Consultez le programme fixe et les communications officielles.
        </p>
      </section>
    </div>
  );
}
