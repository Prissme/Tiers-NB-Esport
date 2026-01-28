import SectionHeader from "../components/SectionHeader";

export default function ResultatsPage() {
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Résultats"
            title="Résultats officiels"
            description="Résultats non publics."
            tone="dominant"
          />
        </div>
      </section>

      <div className="silent-gap" aria-hidden="true" />
      <section className="section-card secondary-section space-y-6">
        <SectionHeader
          kicker="Information"
          title="Publication officielle"
          description="Scores publiés après validation."
          tone="support"
        />
        <p className="text-sm text-muted">
          Consultez le programme fixe et les communications officielles.
        </p>
      </section>
    </div>
  );
}
