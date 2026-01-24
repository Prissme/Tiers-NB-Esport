import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";

const joinSteps = [
  { label: "1. Roster", detail: "5 joueurs" },
  { label: "2. Disponibilités", detail: "Créneaux courts" },
  { label: "3. Validation", detail: "Réponse après contrôle" },
];

export default function ParticiperPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-10 top-6 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-2 top-4 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Participer"
            title="Entrer en trois étapes"
            description="Court, direct, clair."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {joinSteps.map((step) => (
              <div key={step.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{step.label}</p>
                <p className="mt-3 text-sm text-white">{step.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/inscription" variant="primary">
              S&apos;inscrire
            </Button>
            <Button href="/reglement" variant="secondary">
              Règlement
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
