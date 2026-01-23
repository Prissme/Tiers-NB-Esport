import Button from "./Button";
import FrameOrnaments from "./FrameOrnaments";

export default function HeroCard() {
  return (
    <section className="hero-ironhill">
      <div className="hero-ironhill__layer hero-ironhill__bg" aria-hidden="true" />
      <div className="hero-ironhill__layer hero-ironhill__overlay" aria-hidden="true" />
      <div className="hero-ironhill__layer hero-ironhill__grain" aria-hidden="true" />
      <div className="hero-ironhill__layer hero-ironhill__dust" aria-hidden="true" />
      <div className="hero-ironhill__layer hero-ironhill__vignette" aria-hidden="true" />
      <FrameOrnaments label="STEP INTO THE — LEAGUE FORCE NETWORK" />
      <div className="hero-ironhill__content">
        <div className="space-y-5">
          <p className="hero-kicker">Institutionnel • Ligue Premium</p>
          <div className="hero-divider" aria-hidden="true" />
          <h1 className="hero-title">ATTEIGNEZ LE SOMMET</h1>
          <p className="hero-subtitle">SI VOUS EN ÊTES CAPABLES</p>
          <p className="max-w-[720px] text-sm text-[color:var(--color-text-muted)] sm:text-base">
            Une ligue sobre, structurée et exigeante pour les équipes qui visent l&apos;excellence.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
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
