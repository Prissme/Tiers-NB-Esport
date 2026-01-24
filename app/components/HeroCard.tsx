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
            <h1 className="hero-title">SEULS LES MEILLEURS MONTENT.</h1>
            <p className="hero-identity">LFN — Ligue Française Null&apos;s Brawl</p>
            <p className="hero-subtitle">LES AUTRES REGARDENT.</p>
            <p className="hero-copy">
              Une ligue qui retient plus qu&apos;elle ne recrute. Une saison = un test.
            </p>
            <p className="hero-clarifier">
              Si vous hésitez, vous n&apos;êtes pas prêt.
            </p>
            <p className="hero-clarifier">
              ELITE est un statut révocable. Entrée possible. Maintien non garanti.
            </p>
          </div>
          <div className="hero-cta">
            <div className="flex flex-col items-center gap-2">
              <Button
                href="https://forms.gle/pmo6Z2mRLptYMR1J7"
                variant="primary"
                external
                ariaLabel="Soumettre une demande ELITE (nouvel onglet)"
              >
                Soumettre une demande ELITE
              </Button>
              <p className="hero-cta-note">La majorité des demandes sont refusées.</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button
                href="https://discord.gg/prissme"
                variant="tertiary"
                external
                ariaLabel="Observer la ligue sur Discord (nouvel onglet)"
              >
                Observer la ligue
              </Button>
              <p className="hero-cta-note">Accès surveillé • sélection humaine</p>
            </div>
          </div>
        </div>
      </section>
      <section className="hero-features">
        <div className="hero-features__inner">
          <article className="hero-feature-card">
            <h3>Ascension filtrée</h3>
            <p>
              Durée longue, pression constante, endurance obligatoire.
            </p>
          </article>
          <article className="hero-feature-card">
            <h3>Contrôle permanent</h3>
            <p>
              Chaque décision est observée, chaque écart est noté.
            </p>
          </article>
          <article className="hero-feature-card">
            <h3>Sommet révocable</h3>
            <p>
              Le classement exclut plus qu&apos;il ne récompense.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
