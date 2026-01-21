import Button from "./Button";

const sigilPath =
  "M156 28l9 18 20 3-14 14 3 20-18-9-18 9 3-20-14-14 20-3 9-18z";

export default function HeroCard() {
  return (
    <section className="relative mx-auto grid w-full max-w-5xl gap-8 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-card backdrop-blur-[28px] sm:p-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="absolute inset-0 rounded-[32px] border border-white/10 bg-card-gradient opacity-80" />
      <div className="absolute inset-0 rounded-[32px] bg-noise opacity-50" />
      <div className="absolute right-6 top-6 z-10">
        <span className="badge-pill">Season 01 · Invite Only</span>
      </div>
      <div className="relative z-10 space-y-6">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.45em] text-cyan/80">
            LFN — The Elite League
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            La hiérarchie compétitive où chaque match compte.
          </h1>
          <p className="max-w-xl text-base text-slate-300 sm:text-lg">
            Une ligue réservée aux équipes d&apos;élite. Gravissez les rangs, sécurisez votre
            place et imposez votre légende dans l&apos;arène.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button href="/participer" variant="primary">
            Entrer dans la Ligue
          </Button>
          <Button href="/classement" variant="secondary">
            Voir le Classement
          </Button>
          <Button href="/equipes" variant="tertiary">
            Rejoindre une Team
          </Button>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-center">
        <div className="relative flex h-[280px] w-full max-w-[360px] items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-visual-gradient p-6 shadow-[0_35px_60px_-40px_rgba(15,23,42,0.9)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.25),transparent_65%)]" />
          <div className="absolute inset-0 bg-noise opacity-40" />
          <svg
            className="absolute inset-0 h-full w-full opacity-35"
            viewBox="0 0 320 320"
            fill="none"
          >
            <circle cx="160" cy="160" r="140" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
            <circle cx="160" cy="160" r="100" stroke="rgba(34,211,238,0.4)" strokeWidth="0.6" />
            <g fill="rgba(148,163,184,0.3)">
              {Array.from({ length: 12 }).map((_, index) => {
                const rotation = index * 30;
                return (
                  <path
                    key={`sigil-${index}`}
                    d={sigilPath}
                    transform={`translate(160 160) rotate(${rotation}) translate(-160 -160)`}
                  />
                );
              })}
            </g>
          </svg>
          <div className="relative z-10 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-300">
              Central Sigil
            </p>
            <p className="mt-4 text-3xl font-semibold text-white">LFN</p>
            <div className="mt-3 h-px w-16 bg-cyan/40" />
            <p className="mt-4 text-xs text-slate-300">
              Visuel dynamique prêt à être remplacé
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
