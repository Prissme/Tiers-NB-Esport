import Image from "next/image";
import Button from "./Button";

export default function HeroCard() {
  return (
    <section className="hero-cinematic">
      <div className="hero__layer hero__mountain" aria-hidden="true" />
      <div className="hero__layer hero__gradient" aria-hidden="true" />
      <div className="hero__layer hero__grain" aria-hidden="true" />
      <div className="hero__layer hero__fog" aria-hidden="true" />
      <div className="hero__layer hero__snow" aria-hidden="true" />
      <div className="hero__fade" aria-hidden="true" />
      <div className="hero__content">
        <div className="flex items-center justify-center gap-3 sm:justify-start">
          <Image src="/assets/logo.svg" alt="LFN" width={40} height={40} priority />
          <span className="text-xs uppercase tracking-[0.5em] text-white/70">
            Ligue Française Next
          </span>
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold uppercase tracking-[0.18em] text-white sm:text-6xl lg:text-7xl">
            ATTEIGNEZ LE SOMMET.
            <span className="mt-4 block text-xl font-medium uppercase tracking-[0.24em] text-white/70 sm:text-2xl">
              SI VOUS EN ÊTES CAPABLES.
            </span>
          </h1>
          <p className="max-w-2xl text-base text-slate-200 sm:text-lg">
            Une ligue structurée pour celles et ceux qui veulent progresser dans un cadre sérieux, sans
            promesses faciles ni slogans creux.
          </p>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            Sélection sur dossier, saisons encadrées, et des formats pensés pour respecter votre engagement.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
          <Button href="/participer" variant="primary">
            Rejoindre la Ligue
          </Button>
          <Button href="/classement" variant="secondary">
            Voir le Classement
          </Button>
        </div>
      </div>
    </section>
  );
}
