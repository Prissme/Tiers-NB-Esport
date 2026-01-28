import SectionHeader from "../components/SectionHeader";

const reportSteps = [
  { label: "Choisir le match", detail: "Sélection rapide." },
  { label: "Entrer le score", detail: "Deux chiffres." },
  { label: "Valider", detail: "Envoi direct." },
];

const quickFields = ["Match", "Équipe", "Score", "Note"];

export default function ReportPage() {
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Scores"
            title="Score en 20 secondes"
            description="Formulaire court."
            tone="dominant"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {reportSteps.map((step) => (
              <div key={step.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-utility">{step.label}</p>
                <p className="mt-3 text-sm text-white">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="silent-gap" aria-hidden="true" />
      <section className="section-card secondary-section space-y-6">
        <SectionHeader
          kicker="Mini formulaire"
          title="Entrées rapides"
          description="Simple et léger."
          tone="support"
        />
        <div className="flex flex-wrap gap-3">
          {quickFields.map((field) => (
            <span key={field} className="badge">
              {field}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <label className="text-xs uppercase tracking-[0.35em] text-utility">
              Score A
            </label>
            <div className="mt-3 h-10 rounded-[10px] bg-slate-950/60" />
          </div>
          <div className="motion-card">
            <label className="text-xs uppercase tracking-[0.35em] text-utility">
              Score B
            </label>
            <div className="mt-3 h-10 rounded-[10px] bg-slate-950/60" />
          </div>
        </div>
      </section>
    </div>
  );
}
