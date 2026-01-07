import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";

const signupSteps = [
  { label: "Roster", detail: "5 joueurs" },
  { label: "Validation", detail: "Rapide" },
  { label: "Annonce", detail: "Push court" },
];

export default function InscriptionPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-16 top-8 h-52 w-52 motion-drift" />
        <div className="motion-orb motion-orb--blue right-2 top-4 h-48 w-48 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Inscriptions"
            title="Fenêtre courte"
            description="Tout se fait vite."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {signupSteps.map((step) => (
              <div key={step.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{step.label}</p>
                <p className="mt-3 text-sm text-white">{step.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/reglement" variant="secondary">
              Règles
            </Button>
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Rappel"
          title="Check rapide"
          description="Essentiel uniquement."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {["Roster prêt", "Docs OK", "Horaire clair", "Contact staff"].map((item) => (
            <div key={item} className="motion-card">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{item}</p>
              <p className="mt-3 text-sm text-white">Signal visuel.</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
