import CountdownTimer from "./CountdownTimer";

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
      </div>
    </section>
  );
}
