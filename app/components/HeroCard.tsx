import Button from "./Button";

export default function HeroCard() {
  return (
    <section className="hero group relative mx-auto w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/10 p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-white/20 sm:p-10">
      <div className="hero__background" aria-hidden="true" />
      <div className="hero__overlay" aria-hidden="true" />
      <div className="hero__grain" aria-hidden="true" />
      <div className="absolute -inset-20 -z-10 rounded-[48px] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.25),transparent_65%)] opacity-80 blur-[120px]" />
      <div className="absolute inset-0 rounded-[32px] border border-white/10 bg-card-gradient opacity-80" />
      <div className="absolute right-6 top-6 z-10">
        <span className="badge-pill">Invite Only</span>
      </div>
      <div className="hero__content relative z-10 space-y-6 text-center sm:text-left">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.5em] text-cyan/80">LFN</p>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-6xl">
            LFN
          </h1>
          <p className="text-lg text-slate-200 sm:text-xl">
            La ligue. Pas un serveur. Une sélection.
          </p>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            Une porte d&apos;entrée gardée, des places rares, des saisons qui élèvent les meilleurs.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
          <Button href="/participer" variant="primary">
            Entrer dans la Ligue
          </Button>
          <Button href="/classement" variant="secondary">
            Voir le Classement
          </Button>
        </div>
      </div>
    </section>
  );
}
