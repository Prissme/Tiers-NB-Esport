import CountdownTimer from "./CountdownTimer";
import Button from "./Button";
import DiscordIcon from "./DiscordIcon";
import type { Locale } from "../lib/i18n";

const copy = {
  fr: {
    title: "Atteignez le sommet",
    season: "LFN SAISON 5",
    subtitle: "La Ligue Francophone dédiée à",
    highlight: "Null's Brawl",
    watch: "Regarder les matchs",
    signup: "S'inscrire",
  },
  en: {
    title: "Reach the summit",
    season: "LFN SEASON 5",
    subtitle: "The French-speaking league dedicated to",
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
          <p className="hero-kicker hero-kicker--season">{content.season}</p>
          <h1 className="hero-title hero-title--summit">
            {content.title}
          </h1>
          <p className="hero-subtitle">
            {content.subtitle}{" "}
            <span className="hero-highlight-violet">{content.highlight}</span>
          </p>
        </div>
        <div className="hero-cta hero-cta--center">
          <Button href="/matchs" variant="primary">
            {content.watch}
          </Button>
          <Button href="/inscription" variant="secondary" className="hero-signup-button">
            <span className="flex items-center gap-2">
              {content.signup} <DiscordIcon />
            </span>
          </Button>
        </div>
        <CountdownTimer locale={locale} />
      </div>
    </section>
  );
}
