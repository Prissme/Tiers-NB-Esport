import Button from "./Button";

export default function HeroCard() {
  return (
    <>
      <section className="hero-ironhill">
        <div className="hero-ironhill__layer hero-ironhill__bg" aria-hidden="true" />
        <div className="hero-ironhill__layer hero-ironhill__overlay" aria-hidden="true" />
        <div className="hero-ironhill__layer hero-ironhill__halo" aria-hidden="true" />
        <div className="hero-ironhill__layer hero-ironhill__fog" aria-hidden="true" />
        <div className="hero-ironhill__layer hero-ironhill__grain" aria-hidden="true" />
        <div className="hero-ironhill__layer hero-ironhill__dust" aria-hidden="true" />
        <div className="hero-ironhill__layer hero-ironhill__sparkles" aria-hidden="true" />
        <div className="hero-ironhill__layer hero-ironhill__vignette" aria-hidden="true" />
        <div className="hero-ironhill__content">
          <div className="space-y-4">
            <p className="hero-kicker">Ligue francophone Null&apos;s Brawl</p>
            <p className="hero-brand">LFN</p>
            <h1 className="hero-title">ATTEIGNEZ LE SOMMET.</h1>
            <p className="hero-subtitle">SI VOUS EN ÊTES CAPABLES.</p>
            <p className="hero-copy">
              Rejoignez la ligue où l&apos;air se raréfie, où seules les équipes féroces
              restent debout.
            </p>
          </div>
          <div className="hero-cta">
            <Button href="/participer" variant="primary">
              S&apos;inscrire
            </Button>
            <Button href="/classement" variant="secondary">
              Voir le classement
            </Button>
          </div>
        </div>
      </section>
      <section className="hero-features">
        <div className="hero-features__inner">
          <article className="hero-feature-card">
            <h3>Ascension brutale</h3>
            <p>
              Des rounds tendus, une pression continue et un rythme conçu pour faire
              monter l&apos;adrénaline.
            </p>
          </article>
          <article className="hero-feature-card">
            <h3>Brume compétitive</h3>
            <p>
              Une scène obscure et magnétique, où chaque décision compte quand la visibilité
              chute.
            </p>
          </article>
          <article className="hero-feature-card">
            <h3>Respect du sommet</h3>
            <p>
              Un terrain d&apos;élite pour celles et ceux prêts à s&apos;arracher le sommet
              de Null&apos;s Brawl.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
