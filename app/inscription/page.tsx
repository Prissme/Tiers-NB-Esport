import Button from "../components/Button";
import DiscordIcon from "../components/DiscordIcon";
import SectionHeader from "../components/SectionHeader";
import { getLocale } from "../lib/i18n";

const DISCORD_INVITE = "https://discord.gg/q6sFPWCKD7";

export default function InscriptionPage() {
  const locale = getLocale();
  const copy = {
    fr: {
      kicker: "Inscription",
      title: "Avant de rejoindre",
      description:
        "Tu vas être redirigé vers notre serveur pour finaliser ton inscription et accéder aux infos officielles.",
      steps: [
        { label: "1. Accès", detail: "Rejoins le serveur officiel." },
        { label: "2. Lecture", detail: "Prends connaissance des règles." },
        { label: "3. Validation", detail: "Confirme ton roster." },
      ],
      continue: "Continuer",
      back: "Retourner à l'accueil",
    },
    en: {
      kicker: "Sign up",
      title: "Before you join",
      description:
        "You will be redirected to our server to finalize your registration and access official info.",
      steps: [
        { label: "1. Access", detail: "Join the official server." },
        { label: "2. Read", detail: "Review the rules." },
        { label: "3. Validation", detail: "Confirm your roster." },
      ],
      continue: "Continue",
      back: "Back to home",
    },
  };
  const content = copy[locale];
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker={content.kicker}
            title={
              <span className="flex items-center justify-center gap-2">
                {content.title} <DiscordIcon />
              </span>
            }
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
            <Button href={DISCORD_INVITE} variant="primary" external>
              <span className="flex items-center gap-2">
                {content.continue} <DiscordIcon />
              </span>
            </Button>
            <Button href="/" variant="secondary">
              {content.back}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
