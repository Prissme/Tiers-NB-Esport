import SectionHeader from "../components/SectionHeader";

export default function ResultatsPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-12 top-8 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-4 top-4 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Résultats"
            title="Résultats officiels"
            description="Les résultats ne sont pas affichés publiquement."
          />
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Information"
          title="Publication officielle"
          description="Les scores seront diffusés après validation officielle."
        />
        <p className="text-sm text-slate-400">
          Merci de consulter le programme fixe et de suivre les communications officielles pour les
          résultats.
        </p>
      </section>
    </div>
  );
}
