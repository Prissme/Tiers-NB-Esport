import Button from "./Button";
import CountdownTimer from "./CountdownTimer";

const DISCORD_INVITE = "https://discord.gg/q6sFPWCKD7";

export default function HeroCard() {
  return (
    <section className="hero-ironhill">
      <div className="hero-ironhill__layer hero-ironhill__overlay" aria-hidden="true" />
      <div className="hero-ironhill__content">
        <div className="space-y-4">
          <p className="hero-kicker">LFN</p>
          <h1 className="hero-title">ATTEIGNEZ LE SOMMET.</h1>
          <p className="hero-subtitle">ACCÈS SUR SÉLECTION.</p>
        </div>
        <CountdownTimer />
        <div className="hero-cta">
          <Button
            href={DISCORD_INVITE}
            variant="primary"
            external
            ariaLabel="Rejoindre la ligue sur Discord"
          >
            S&apos;INSCRIRE
          </Button>
          <Button href="/classement" variant="secondary" ariaLabel="Voir le classement">
            VOIR LE CLASSEMENT
          </Button>
        </div>
      </div>
    </section>
  );
}
