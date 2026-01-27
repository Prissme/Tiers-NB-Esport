import CountdownTimer from "./CountdownTimer";
import Button from "./Button";

export default function HeroCard() {
  return (
    <section className="hero-ironhill">
      <div className="hero-ironhill__layer hero-ironhill__overlay" aria-hidden="true" />
      <div className="hero-ironhill__content">
        <div className="space-y-4">
          <p className="hero-kicker">LFN</p>
          <h1 className="hero-title">La ligue francophone compétitive sur Null’s Brawl</h1>
          <p className="hero-subtitle">
            Regarde les matchs officiels, rejoins la compétition et connecte-toi à la communauté.
          </p>
        </div>
        <div className="hero-cta">
          <Button href="/matchs" variant="primary">
            Regarder les matchs
          </Button>
          <Button href="/inscription" variant="secondary">
            S&apos;inscrire via Discord
          </Button>
        </div>
        <p className="text-xs uppercase tracking-[0.32em] text-white/70">
          Toutes les inscriptions se font sur Discord
        </p>
        <CountdownTimer />
      </div>
    </section>
  );
}
