import type { Metadata } from "next";
import SectionHeader from "../components/SectionHeader";

export const metadata: Metadata = {
  title: "Classements",
  description: "Classement disponible après validation officielle.",
};

export default function ClassementPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-14 top-10 h-52 w-52 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-6 h-44 w-44 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Classement"
            title="Classement officiel"
            description="Le classement sera publié après validation officielle."
          />
        </div>
      </section>

      <section className="section-card space-y-4">
        <SectionHeader
          kicker="Information"
          title="Publication à venir"
          description="Merci de consulter le programme fixe en attendant."
        />
        <p className="text-sm text-slate-400">
          Les résultats ne sont pas affichés publiquement. Le classement sera rendu public une fois
          validé par l'organisation.
        </p>
      </section>
    </div>
  );
}
