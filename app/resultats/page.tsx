import SectionHeader from "../components/SectionHeader";
import { getLocale } from "../lib/i18n";

export default function ResultatsPage() {
  const locale = getLocale();
  const copy = {
    fr: {
      kicker: "Résultats",
      title: "Résultats officiels",
      description: "Résultats non publics.",
      infoKicker: "Information",
      infoTitle: "Publication officielle",
      infoDescription: "Scores publiés après validation.",
      note: "Consultez le programme fixe et les communications officielles.",
    },
    en: {
      kicker: "Results",
      title: "Official results",
      description: "Results are private.",
      infoKicker: "Information",
      infoTitle: "Official publication",
      infoDescription: "Scores published after validation.",
      note: "Check the fixed schedule and official communications.",
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
        </div>
      </section>

      <div className="silent-gap" aria-hidden="true" />
      <section className="section-card secondary-section space-y-6">
        <SectionHeader
          kicker={content.infoKicker}
          title={content.infoTitle}
          description={content.infoDescription}
          tone="support"
        />
        <p className="text-sm text-muted">
          {content.note}
        </p>
      </section>
    </div>
  );
}
