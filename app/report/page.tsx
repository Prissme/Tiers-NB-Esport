import SectionHeader from "../components/SectionHeader";
import { getLocale } from "../lib/i18n";

export default function ReportPage() {
  const locale = getLocale();
  const copy = {
    fr: {
      steps: [
        { label: "Choisir le match", detail: "Sélection rapide." },
        { label: "Entrer le score", detail: "Deux chiffres." },
        { label: "Valider", detail: "Envoi direct." },
      ],
      quickFields: ["Match", "Équipe", "Score", "Note"],
      scoresKicker: "Scores",
      scoresTitle: "Score en 20 secondes",
      scoresDescription: "Formulaire court.",
      miniKicker: "Mini formulaire",
      miniTitle: "Entrées rapides",
      miniDescription: "Simple et léger.",
      scoreA: "Score A",
      scoreB: "Score B",
    },
    en: {
      steps: [
        { label: "Choose the match", detail: "Quick selection." },
        { label: "Enter the score", detail: "Two numbers." },
        { label: "Validate", detail: "Direct submission." },
      ],
      quickFields: ["Match", "Team", "Score", "Note"],
      scoresKicker: "Scores",
      scoresTitle: "Score in 20 seconds",
      scoresDescription: "Short form.",
      miniKicker: "Mini form",
      miniTitle: "Quick entries",
      miniDescription: "Simple and lightweight.",
      scoreA: "Score A",
      scoreB: "Score B",
    },
  };
  const content = copy[locale];
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker={content.scoresKicker}
            title={content.scoresTitle}
            description={content.scoresDescription}
            tone="dominant"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {content.steps.map((step) => (
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
          kicker={content.miniKicker}
          title={content.miniTitle}
          description={content.miniDescription}
          tone="support"
        />
        <div className="flex flex-wrap gap-3">
          {content.quickFields.map((field) => (
            <span key={field} className="badge">
              {field}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <label className="text-xs uppercase tracking-[0.35em] text-utility">
              {content.scoreA}
            </label>
            <div className="mt-3 h-10 rounded-[10px] bg-slate-950/60" />
          </div>
          <div className="motion-card">
            <label className="text-xs uppercase tracking-[0.35em] text-utility">
              {content.scoreB}
            </label>
            <div className="mt-3 h-10 rounded-[10px] bg-slate-950/60" />
          </div>
        </div>
      </section>
    </div>
  );
}
