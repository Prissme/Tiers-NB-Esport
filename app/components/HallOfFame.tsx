import type { Locale } from "../lib/i18n";
import ReloadingImage from "./ReloadingImage";

const hallOfFameEntries = {
  fr: [
    {
      season: "Saison 1",
      winner: "T1",
      date: "26/12/2025",
      image:
        "https://media.discordapp.net/attachments/1434252768633290952/1471236020816056491/ChatGPT_Image_25_janv._2026_09_16_59.png?ex=698e32d1&is=698ce151&hm=06a8105ed7871d19caf5ba485e86a85067bf13243b3c35f7f1b39ab25573341b&=&format=webp&quality=lossless&width=875&height=583",
    },
    {
      season: "Saison 2",
      winner: "BT",
      date: "03/01/2026",
      image:
        "https://media.discordapp.net/attachments/1434252768633290952/1471236021394997473/ChatGPT_Image_24_janv._2026_23_18_22.png?ex=698e32d1&is=698ce151&hm=8e41f227fe338a6b79c2737461deb14bdf7db8f93ce99a8e19dd2e12b8ee04b1&=&format=webp&quality=lossless&width=875&height=583",
    },
    {
      season: "Saison 3",
      winner: "Brandon & Dylan",
      date: "17/01/2026",
      image:
        "https://media.discordapp.net/attachments/1434252768633290952/1471236021877473433/ChatGPT_Image_24_janv._2026_23_18_19.png?ex=698e32d1&is=698ce151&hm=ad1edfe9a12501aa9af247accd00d9c1346c2f141f8b71d43a8949bd1f40b12b&=&format=webp&quality=lossless&width=875&height=583",
    },
    {
      season: "Saison 4",
      winner: "Brandon & Dylan",
      date: "31/01/2026",
      image:
        "https://media.discordapp.net/attachments/1434252768633290952/1471236021877473433/ChatGPT_Image_24_janv._2026_23_18_19.png?ex=698e32d1&is=698ce151&hm=ad1edfe9a12501aa9af247accd00d9c1346c2f141f8b71d43a8949bd1f40b12b&=&format=webp&quality=lossless&width=875&height=583",
    },
  ],
  en: [
    {
      season: "Season 1",
      winner: "T1",
      date: "12/26/2025",
      image:
        "https://media.discordapp.net/attachments/1434252768633290952/1471236020816056491/ChatGPT_Image_25_janv._2026_09_16_59.png?ex=698e32d1&is=698ce151&hm=06a8105ed7871d19caf5ba485e86a85067bf13243b3c35f7f1b39ab25573341b&=&format=webp&quality=lossless&width=875&height=583",
    },
    {
      season: "Season 2",
      winner: "BT",
      date: "01/03/2026",
      image:
        "https://media.discordapp.net/attachments/1434252768633290952/1471236021394997473/ChatGPT_Image_24_janv._2026_23_18_22.png?ex=698e32d1&is=698ce151&hm=8e41f227fe338a6b79c2737461deb14bdf7db8f93ce99a8e19dd2e12b8ee04b1&=&format=webp&quality=lossless&width=875&height=583",
    },
    {
      season: "Season 3",
      winner: "Brandon & Dylan",
      date: "01/17/2026",
      image:
        "https://media.discordapp.net/attachments/1434252768633290952/1471236021877473433/ChatGPT_Image_24_janv._2026_23_18_19.png?ex=698e32d1&is=698ce151&hm=ad1edfe9a12501aa9af247accd00d9c1346c2f141f8b71d43a8949bd1f40b12b&=&format=webp&quality=lossless&width=875&height=583",
    },
    {
      season: "Season 4",
      winner: "Brandon & Dylan",
      date: "01/31/2026",
      image:
        "https://media.discordapp.net/attachments/1434252768633290952/1471236021877473433/ChatGPT_Image_24_janv._2026_23_18_19.png?ex=698e32d1&is=698ce151&hm=ad1edfe9a12501aa9af247accd00d9c1346c2f141f8b71d43a8949bd1f40b12b&=&format=webp&quality=lossless&width=875&height=583",
    },
  ],
};

const INSCRIPTION_PATH = "/inscription";
const HALL_EMBLEM_URL =
  "https://media.discordapp.net/attachments/1434252768633290952/1466084863449763903/image-Photoroom_11.png?ex=697e186d&is=697cc6ed&hm=e30de7c3aabc5ab64e71deb5f0eccc4c3beff07ba08b585a6977e3d04389e176&=&format=webp&quality=lossless&width=220&height=219";
const SIGNUP_EMBLEM_URL =
  "https://media.discordapp.net/attachments/1434252768633290952/1466080774112542762/image-Photoroom_10.png?ex=697e149f&is=697cc31f&hm=ac7bbb921eb8b3538106cccf9dadb1bdac9190853a30407559cf7e8eb53a80ff&=&format=webp&quality=lossless&width=236&height=236";

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
      className="font-prata mt-16 overflow-hidden rounded-[16px] bg-cover bg-center px-5 py-12 shadow-[0_0_60px_rgba(0,0,0,0.3)] sm:px-8 lg:px-12"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(6,10,22,0.75), rgba(9,14,30,0.75)), url('https://media.discordapp.net/attachments/1434252768633290952/1471235398637326491/Montagne.png?ex=698e323d&is=698ce0bd&hm=c139a3af6d5e8a2303bec43210e9e7ef8cf28a853697c2dc1840fe81c8eee32a&=&format=webp&quality=lossless&width=875&height=583')",
      }}
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
