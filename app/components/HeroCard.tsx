import Button from "./Button";

export default function HeroCard() {
  return (
    <section className="hero-ironhill">
      <div className="hero-ironhill__layer hero-ironhill__bg" aria-hidden="true" />
      <div className="hero-ironhill__layer hero-ironhill__overlay" aria-hidden="true" />
      <div className="hero-ironhill__layer hero-ironhill__grain" aria-hidden="true" />
      <div className="hero-ironhill__frame" aria-hidden="true">
        <span className="hero-frame__marker hero-frame__marker--tl" />
        <span className="hero-frame__marker hero-frame__marker--tr" />
        <span className="hero-frame__marker hero-frame__marker--bl" />
        <span className="hero-frame__marker hero-frame__marker--br" />
      </div>
      <div className="hero-ironhill__content">
        <span className="hero-label">LEAGUE FORCE NETWORK</span>
        <div className="space-y-5">
          <p className="hero-kicker">Institutionnel • Ligue Premium</p>
          <h1 className="hero-title">ATTEIGNEZ LE SOMMET</h1>
          <p className="hero-subtitle">SI VOUS EN ÊTES CAPABLES</p>
          <p className="max-w-xl text-sm text-[color:var(--color-text-muted)] sm:text-base">
            Une ligue sobre, structurée et exigeante pour les équipes qui visent l&apos;excellence.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
          <Button href="/participer" variant="primary">
            S&apos;inscrire
          </Button>
          <Button href="/classement" variant="secondary">
            Voir le classement
          </Button>
        </div>
      </div>
    </section>
  );
}
