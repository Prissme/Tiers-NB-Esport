import HeroCard from "./components/HeroCard";
import EliteOffer from "./components/EliteOffer";
import Button from "./components/Button";
import { getLocale } from "./lib/i18n";

export default function HomePage() {
  const locale = getLocale();
  const copy = {
    fr: {
      matches: "Matchs en LFN",
      players: "Joueurs en LFN",
      viewers: "Sur discord",
      viewersCount: "30+ spectateurs",
      competitionsTitle: "Compétitions",
      eventTitle: "PrissCup",
      eventDate: "Dimanche 29 mars à 16h",
      eventDescription:
        "La prochaine compétition démarre ce dimanche avec la PrissCup. Inscris-toi et viens tenter ta chance.",
      joinButton: "Participer",
    },
    en: {
      matches: "LFN matches",
      players: "LFN players",
      viewers: "On Discord",
      viewersCount: "30+ viewers",
      competitionsTitle: "Competitions",
      eventTitle: "PrissCup",
      eventDate: "Sunday, March 29 at 4 PM",
      eventDescription:
        "The next competition starts this Sunday with the PrissCup. Sign up and join the action.",
      joinButton: "Join",
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
        <section className="secondary-section">
          <div className="surface-dominant rounded-[14px] px-6 py-8 shadow-[0_20px_60px_rgba(4,10,30,0.45)] sm:px-10">
            <p className="text-xs uppercase tracking-[0.35em] text-utility">{content.competitionsTitle}</p>
            <div className="mt-5 flex flex-col gap-6 rounded-[12px] border border-white/10 bg-[rgba(7,13,27,0.72)] p-5 sm:p-6">
              <div className="space-y-2">
                <h2 className="font-sekuya text-2xl text-white sm:text-3xl">{content.eventTitle}</h2>
                <p className="text-xs uppercase tracking-[0.28em] text-utility">{content.eventDate}</p>
                <p className="max-w-3xl text-sm text-slate-200 sm:text-base">{content.eventDescription}</p>
              </div>
              <div>
                <Button
                  href="https://discord.com/events/1236724293027496047/1486382244644917288"
                  external
                >
                  {content.joinButton}
                </Button>
              </div>
            </div>
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
