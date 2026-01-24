const hallOfFameEntries = [
  {
    season: "Season 1",
    winner: "T-1 E-Sports",
    image:
      "https://media.discordapp.net/attachments/1434252768633290952/1464746362250854531/ChatGPT_Image_24_janv._2026_23_18_25.png?ex=697696da&is=6975455a&hm=e4597016c9927739cd4362832d779a04cb7442b0e0fd12a08cfff06e7c0cd51e&=&format=webp&quality=lossless&width=875&height=583",
  },
  {
    season: "Season 2",
    winner: "Belle Teub E-Sports",
    image:
      "https://media.discordapp.net/attachments/1434252768633290952/1464746362666221598/ChatGPT_Image_24_janv._2026_23_18_22.png?ex=697696da&is=6975455a&hm=e7cc27542f99462b28a7ca36e1089d13142c1ed9ecfb9480c6d52c2345038ed2&=&format=webp&quality=lossless&width=875&height=583",
  },
  {
    season: "Season 3",
    winner: "Brandon & Dylan E-sports",
    image:
      "https://media.discordapp.net/attachments/1434252768633290952/1464746363072938118/ChatGPT_Image_24_janv._2026_23_18_19.png?ex=697696da&is=6975455a&hm=5965480177529f2d7870b2c39f2ca0af1f210be37e8284afba9bdb3a332daecb&=&format=webp&quality=lossless&width=875&height=583",
  },
];

export default function HallOfFame() {
  return (
    <section className="mt-16 overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(98,255,255,0.15),_transparent_60%),_linear-gradient(135deg,_rgba(6,10,22,0.98),_rgba(9,14,30,0.98))] px-5 py-12 shadow-[0_0_60px_rgba(86,220,255,0.08)] sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200/70">
            Hall of Fame
          </p>
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            Les winners des précédentes LFN
          </h2>
          <p className="max-w-2xl text-sm text-slate-300">
            De la Saison 1 à la Saison 3, ils ont pris la lumière. Saison 4 :{" "}
            <span className="font-semibold text-cyan-100">Peut-être toi qui sait ?</span>
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          {hallOfFameEntries.map((entry) => (
            <article
              key={entry.season}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_50px_rgba(4,10,30,0.45)]"
            >
              <div className="aspect-[3/2] w-full overflow-hidden">
                <img
                  src={entry.image}
                  alt={`${entry.winner} — ${entry.season}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#05070f] via-transparent to-transparent opacity-90" />
              <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">
                  {entry.season}
                </p>
                <h3 className="text-xl font-semibold text-white">{entry.winner}</h3>
              </div>
            </article>
          ))}
          <article className="relative flex min-h-[320px] flex-col justify-between rounded-3xl border border-dashed border-cyan-200/40 bg-[linear-gradient(135deg,_rgba(18,30,52,0.9),_rgba(6,10,22,0.95))] p-8 text-white shadow-[0_15px_45px_rgba(59,130,246,0.2)]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
                Season 4
              </p>
              <h3 className="text-2xl font-semibold">
                Peut-être toi qui sait ?
              </h3>
              <p className="text-sm text-slate-300">
                La place est libre. Écris la prochaine légende.
              </p>
            </div>
            <div className="mt-10 h-24 w-24 rounded-full border border-cyan-200/40 bg-cyan-200/10 blur-[0.5px]" />
          </article>
        </div>
      </div>
    </section>
  );
}
