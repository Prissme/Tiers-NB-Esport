import Button from "./Button";

export default function HeroCard() {
  return (
    <section className="hero-ironhill">
      <div className="hero-ironhill__layer hero-ironhill__overlay" aria-hidden="true" />
      <div className="hero-ironhill__content">
        <div className="space-y-4">
          <p className="hero-kicker">LFN</p>
          <h1 className="hero-title">ATTEIGNEZ LE SOMMET.</h1>
          <p className="hero-subtitle">SI VOUS EN ÊTES CAPABLES.</p>
        </div>
        <div className="hero-cta">
          <Button href="/inscription" variant="primary" ariaLabel="Entrer dans la ligue">
            ENTRER DANS LA LIGUE
          </Button>
          <Button href="/classement" variant="secondary" ariaLabel="Voir le classement">
            VOIR LE CLASSEMENT
          </Button>
        </div>
      </div>
    </section>
  );
}
