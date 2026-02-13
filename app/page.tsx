import HeroCard from "./components/HeroCard";
import EliteOffer from "./components/EliteOffer";
import { getLocale } from "./lib/i18n";

export default function HomePage() {
  const locale = getLocale();
  const copy = {
    fr: {
      matches: "Matchs en LFN",
      players: "Joueurs en LFN",
      viewers: "Sur discord",
      viewersCount: "30+ spectateurs",
    },
    en: {
      matches: "LFN matches",
      players: "LFN players",
      viewers: "On Discord",
      viewersCount: "30+ viewers",
    },
  };
  const content = copy[locale];
  return (
    <div className="page-shell">
      <HeroCard locale={locale} />
      <div className="page-stack page-stack--tight">
        <section className="secondary-section social-proof-section">
          <div className="space-y-8">
            <div className="grid gap-6 text-center sm:grid-cols-3">
              <article className="social-proof-card social-proof-card--gold">
                <p className="social-proof-number text-4xl text-white sm:text-5xl">50+</p>
                <p className="social-proof-label mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-200">
                  {content.matches}
                </p>
              </article>
              <article className="social-proof-card social-proof-card--gold social-proof-card--delay">
                <p className="social-proof-number text-4xl text-white sm:text-5xl">100+</p>
                <p className="social-proof-label mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-200">
                  {content.players}
                </p>
              </article>
              <article className="social-proof-card">
                <p className="social-proof-number text-3xl text-white sm:text-4xl">
                  {content.viewersCount}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-200">
                  {content.viewers}
                </p>
              </article>
            </div>
          </div>
        </section>
        <section className="secondary-section">
          <div className="surface-dominant rounded-[14px] px-6 py-8 text-center shadow-[0_20px_60px_rgba(4,10,30,0.45)] sm:px-10">
            <p className="text-xs uppercase tracking-[0.35em] text-utility">LFN</p>
            <p className="mx-auto mt-4 max-w-4xl text-sm leading-relaxed text-slate-200 sm:text-base">
              {locale === "fr"
                ? "La LFN est un projet e-sport ambitieux sur Null's Brawl, pensé pour faire vivre la compétition sur le jeu avec du haut niveau et des émotions à chaque saison."
                : "LFN is an ambitious esports project on Null's Brawl, built to keep high-level competition alive with strong emotions every season."}
            </p>
          </div>
        </section>
        <div className="silent-gap" aria-hidden="true" />
        <div className="secondary-section">
          <EliteOffer locale={locale} />
        </div>
      </div>
    </div>
  );
}
