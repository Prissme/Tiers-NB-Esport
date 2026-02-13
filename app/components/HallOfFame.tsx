import type { Locale } from "../lib/i18n";
import ReloadingImage from "./ReloadingImage";

const hallOfFameEntries = {
  fr: [
    {
      season: "Saison 1",
      winner: "T1",
      date: "26/12/2025",
      image:
        "/WinnersV1.webp",
    },
    {
      season: "Saison 2",
      winner: "BT",
      date: "03/01/2026",
      image:
        "/WinnersV2.webp",
    },
    {
      season: "Saison 3",
      winner: "Brandon & Dylan",
      date: "17/01/2026",
      image:
        "/WinnersV3et4.webp",
    },
    {
      season: "Saison 4",
      winner: "Brandon & Dylan",
      date: "31/01/2026",
      image:
        "/WinnersV3et4.webp",
    },
  ],
  en: [
    {
      season: "Season 1",
      winner: "T1",
      date: "12/26/2025",
      image:
        "/WinnersV1.webp",
    },
    {
      season: "Season 2",
      winner: "BT",
      date: "01/03/2026",
      image:
        "/WinnersV2.webp",
    },
    {
      season: "Season 3",
      winner: "Brandon & Dylan",
      date: "01/17/2026",
      image:
        "/WinnersV3et4.webp",
    },
    {
      season: "Season 4",
      winner: "Brandon & Dylan",
      date: "01/31/2026",
      image:
        "/WinnersV3et4.webp",
    },
  ],
};

const INSCRIPTION_PATH = "/inscription";
const HALL_EMBLEM_URL = "/Trophée.webp";
const SIGNUP_EMBLEM_URL = "/Discord.webp";

const copy = {
  fr: {
    title: "Hall of Fame",
    description:
      "De la Saison 1 à la Saison 4, ils ont pris la lumière. La Saison 5 arrive, la place est encore à prendre.",
    seasonFour: "Saison 5",
    seasonFourTitle: "Peut-être toi, si t'en es capable",
    seasonFourDescription: "La place est libre. Écris la prochaine légende.",
    signup: "S'inscrire",
  },
  en: {
    title: "Hall of Fame",
    description:
      "From Season 1 to Season 4, they owned the spotlight. Season 5 is coming, the spot is still up for grabs.",
    seasonFour: "Season 5",
    seasonFourTitle: "Maybe you, if you can handle it",
    seasonFourDescription: "The spot is open. Write the next legend.",
    signup: "Sign up",
  },
};

export default function HallOfFame({ locale }: { locale: Locale }) {
  const entries = hallOfFameEntries[locale];
  const content = copy[locale];
  return (
    <section
      className="font-prata mt-16 overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,rgba(6,10,22,0.75),rgba(9,14,30,0.75))] px-5 py-12 shadow-[0_0_60px_rgba(0,0,0,0.3)] sm:px-8 lg:px-12"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <h2 className="font-sekuya text-2xl font-semibold text-white sm:text-3xl">
            {content.title}
          </h2>
          <div className="quiet-divider max-w-[220px]" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm text-muted">
              {content.description}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-10">
          {entries.map((entry) => (
            <article
              key={entry.season}
              className="group relative overflow-hidden rounded-[14px] bg-white/[0.03] shadow-[0_20px_50px_rgba(4,10,30,0.45)]"
            >
              <div className="aspect-[16/9] w-full overflow-hidden">
                <ReloadingImage
                  src={entry.image}
                  alt={`${entry.winner} — ${entry.season}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#05070f] via-transparent to-transparent opacity-80" />
              <ReloadingImage
                src={HALL_EMBLEM_URL}
                alt=""
                className="hall-of-fame-emblem"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-white/70">
                  {entry.season}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  {entry.date}
                </p>
                <h3 className="text-xl font-semibold text-white">{entry.winner}</h3>
              </div>
            </article>
          ))}
          <article className="relative flex min-h-[280px] flex-col justify-between rounded-[14px] bg-white/[0.03] p-8 text-white shadow-[0_15px_45px_rgba(0,0,0,0.3)]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                {content.seasonFour}
              </p>
              <h3 className="text-2xl font-semibold">{content.seasonFourTitle}</h3>
              <p className="text-sm text-muted">
                {content.seasonFourDescription}
              </p>
            </div>
            <div className="mt-10 flex flex-col items-start gap-6">
              <a href={INSCRIPTION_PATH} className="season-signup-button">
                <span>{content.signup}</span>
                <ReloadingImage
                  src={SIGNUP_EMBLEM_URL}
                  alt=""
                  className="season-signup-button__icon"
                  loading="lazy"
                />
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
