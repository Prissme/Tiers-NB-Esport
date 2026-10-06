import CountdownTimer from "./CountdownTimer";
import Button from "./Button";
import DiscordIcon from "./DiscordIcon";
import type { Locale } from "../lib/i18n";

const copy = {
  fr: {
    title: "Atteignez le sommet",
    subtitle: "La Ligue Internationale dédiée à",
    highlight: "Null's Brawl",
    watch: "Regarder les matchs",
    signup: "S'inscrire",
  },
  en: {
    title: "Reach the summit",
    subtitle: "The international league dedicated to",
    highlight: "Null's Brawl",
    watch: "Watch matches",
    signup: "Sign up",
  },
};

export default function HeroCard({ locale }: { locale: Locale }) {
  const content = copy[locale];
  return (
    <section className="hero-ironhill dominant-hero">
      <div className="hero-ironhill__layer hero-ironhill__bg" aria-hidden="true" />
      <div className="hero-ironhill__layer hero-ironhill__overlay" aria-hidden="true" />
      <div className="hero-ironhill__content hero-ironhill__content--center">
        <div className="space-y-5 text-center">
          <h1 className="hero-title hero-title--summit">
            {content.title}
          </h1>
          <p className="hero-subtitle hero-subtitle--prominent">
            {content.subtitle}{" "}
            <span className="hero-highlight-violet">{content.highlight}</span>
          </p>
        </div>
        <div className="hero-cta hero-cta--center">
          <Button href="/leaderboard" variant="primary">
            {content.watch}
          </Button>
          {/* <a> natif : /auth/login est une route handler qui redirige vers Discord (pas de prefetch) */}
          <a
            href="/auth/login"
            className="hero-signup-button relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[8px] bg-[rgba(255,255,255,0.04)] px-7 py-[14px] text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-faint)] transition duration-300 hover:bg-[rgba(255,255,255,0.1)] hover:text-[color:var(--color-text)]"
          >
            <span className="flex items-center gap-2">
              {content.signup} <DiscordIcon />
            </span>
          </a>
        </div>
        <CountdownTimer locale={locale} />
      </div>
    </section>
  );
}
