import CountdownTimer from "./CountdownTimer";
import Button from "./Button";
import DiscordIcon from "./DiscordIcon";

export default function HeroCard() {
  return (
    <section className="hero-ironhill dominant-hero">
      <div className="hero-ironhill__layer hero-ironhill__overlay" aria-hidden="true" />
      <div className="hero-ironhill__content hero-ironhill__content--center">
        <div className="space-y-5 text-center">
          <p className="hero-kicker">LFN</p>
          <h1 className="hero-title hero-title--summit">
            Atteignez le sommet
          </h1>
          <p className="hero-subtitle">
            La Ligue Francophone dédiée à{" "}
            <span className="hero-highlight-violet">Null&apos;s Brawl</span>
          </p>
        </div>
        <div className="hero-cta hero-cta--center">
          <Button href="/matchs" variant="primary">
            Regarder les matchs
          </Button>
          <Button href="/inscription" variant="secondary">
            <span className="flex items-center gap-2">
              S&apos;inscrire <DiscordIcon />
            </span>
          </Button>
        </div>
        <CountdownTimer />
      </div>
    </section>
  );
}
