const hallOfFameEntries = [
  {
    season: "Season 1",
    winner: "T1",
    date: "26/12/2025",
    image:
      "https://media.discordapp.net/attachments/1434252768633290952/1464897892274667660/ChatGPT_Image_25_janv._2026_09_16_59.png?ex=697723fa&is=6975d27a&hm=2e0366744cc120da02f5c7b54ab4636f6086b5f851b90571cb2a30f386e76b83&=&format=webp&quality=lossless&width=874&height=583",
  },
  {
    season: "Season 2",
    winner: "BT",
    date: "03/01/2026",
    image:
      "https://media.discordapp.net/attachments/1434252768633290952/1464746362666221598/ChatGPT_Image_24_janv._2026_23_18_22.png?ex=697696da&is=6975455a&hm=e7cc27542f99462b28a7ca36e1089d13142c1ed9ecfb9480c6d52c2345038ed2&=&format=webp&quality=lossless&width=875&height=583",
  },
  {
    season: "Season 3",
    winner: "Brandon & Dylan",
    date: "17/01/2026",
    image:
      "https://media.discordapp.net/attachments/1434252768633290952/1464746363072938118/ChatGPT_Image_24_janv._2026_23_18_19.png?ex=697696da&is=6975455a&hm=5965480177529f2d7870b2c39f2ca0af1f210be37e8284afba9bdb3a332daecb&=&format=webp&quality=lossless&width=875&height=583",
  },
];

const INSCRIPTION_PATH = "/inscription";

export default function HallOfFame() {
  return (
    <section className="font-prata mt-16 overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,_rgba(6,10,22,0.75),_rgba(9,14,30,0.75))] px-5 py-12 shadow-[0_0_60px_rgba(0,0,0,0.3)] sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <h2 className="font-sekuya text-2xl font-semibold text-white sm:text-3xl">
            Hall of Fame
          </h2>
          <div className="quiet-divider max-w-[220px]" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm text-muted">
              De la Saison 1 à la Saison 3, ils ont pris la lumière. La Saison 4 arrive, la place
              est encore à prendre.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-10">
          {hallOfFameEntries.map((entry) => (
            <article
              key={entry.season}
              className="group relative overflow-hidden rounded-[14px] bg-white/[0.03] shadow-[0_20px_50px_rgba(4,10,30,0.45)]"
            >
              <div className="aspect-[16/9] w-full overflow-hidden">
                <img
                  src={entry.image}
                  alt={`${entry.winner} — ${entry.season}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#05070f] via-transparent to-transparent opacity-80" />
              <img
                src="https://cdn.discordapp.com/attachments/1434252768633290952/1466084863449763903/image-Photoroom_11.png?ex=697b756d&is=697a23ed&hm=d67887bbe3cd098b13789dd232d31e9c2cbc7d442fb3b088e6f9db14dbae8884"
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
                Season 4
              </p>
              <h3 className="text-2xl font-semibold">Peut-être toi, si t&apos;en es capable</h3>
              <p className="text-sm text-muted">
                La place est libre. Écris la prochaine légende.
              </p>
            </div>
            <div className="mt-10 flex flex-col items-start gap-6">
              <a href={INSCRIPTION_PATH} className="season-signup-button">
                S&apos;inscrire
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
