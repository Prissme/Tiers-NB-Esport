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
            <h1 className="hero-title">VIVEZ LA LFN EN MODE CINÉMA.</h1>
            <p className="hero-identity">LFN — Ligue Française Null&apos;s Brawl</p>
            <p className="hero-subtitle">COMPÉTITION • COMMUNAUTÉ • CONTENU PREMIUM</p>
            <p className="hero-copy">
              Découvrez la scène Null&apos;s Brawl, suivez les équipes et choisissez un accès ELITE
              pour profiter des avantages premium.
            </p>
            <p className="hero-clarifier">La LFN est la ligue francophone qui rassemble les meilleurs rosters.</p>
            <p className="hero-clarifier">ELITE ouvre l&apos;accès aux contenus, événements et expériences VIP.</p>
          </div>
          <div className="hero-cta">
            <div className="flex flex-col items-center gap-2">
              <Button
                href="https://forms.gle/pmo6Z2mRLptYMR1J7"
                variant="primary"
                external
                ariaLabel="Demander l'accès ELITE (nouvel onglet)"
              >
                Demander l&apos;accès ELITE
              </Button>
              <p className="hero-cta-note">Formule premium • accès limité</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button
                href="https://discord.gg/prissme"
                variant="tertiary"
                external
                ariaLabel="Découvrir la ligue sur Discord (nouvel onglet)"
              >
                Découvrir la ligue
              </Button>
              <p className="hero-cta-note">Communauté • actus • matchs</p>
            </div>
          </div>
        </div>
      </section>
      <section className="hero-features">
        <div className="hero-features__inner">
          <article className="hero-feature-card">
            <h3>Suivi complet</h3>
            <p>
              Calendrier, résultats, et performances des équipes LFN.
            </p>
          </article>
          <article className="hero-feature-card">
            <h3>Accès ELITE</h3>
            <p>
              Contenus premium, badges, et événements réservés aux membres.
            </p>
          </article>
          <article className="hero-feature-card">
            <h3>Immersion cinéma</h3>
            <p>
              Un décor vivant pour vivre chaque match comme un trailer.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
