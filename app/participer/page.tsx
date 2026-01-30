import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";
import { getLocale } from "../lib/i18n";

const INSCRIPTION_PATH = "/inscription";

export default function ParticiperPage() {
  const locale = getLocale();
  const copy = {
    fr: {
      kicker: "Participer",
      title: "Entrer en trois étapes",
      description: "Court, direct, clair.",
      steps: [
        { label: "1. Roster", detail: "5 joueurs" },
        { label: "2. Disponibilités", detail: "Créneaux courts" },
        { label: "3. Validation", detail: "Réponse après contrôle" },
      ],
      signup: "S'inscrire",
      rules: "Règlement",
    },
    en: {
      kicker: "Participate",
      title: "Join in three steps",
      description: "Short, direct, clear.",
      steps: [
        { label: "1. Roster", detail: "5 players" },
        { label: "2. Availability", detail: "Short time slots" },
        { label: "3. Validation", detail: "Answer after review" },
      ],
      signup: "Sign up",
      rules: "Rules",
    },
  };
  const content = copy[locale];
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker={content.kicker}
            title={content.title}
            description={content.description}
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
          <div className="flex flex-wrap gap-3">
            <Button href={INSCRIPTION_PATH} variant="primary" className="signup-button">
              {content.signup}
            </Button>
            <Button href="/reglement" variant="secondary">
              {content.rules}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
