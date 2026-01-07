import Button from "./components/Button";
const motionCards = [
  { title: "Matches", detail: "Plus de 30 matchs joués" },
  { title: "Scores", detail: "Validation rapide" },
  { title: "Teams", detail: "Rosters visibles" },
  { title: "Règles", detail: "Formats clairs" },
];

export default async function HomePage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8 md:p-10">
        <div className="motion-orb -left-20 top-10 h-56 w-56 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-0 h-64 w-64 motion-spin" />
        <div className="motion-orb motion-orb--pink bottom-[-80px] left-1/3 h-72 w-72 motion-drift" />
        <div className="absolute inset-0 grid-lines opacity-30" />
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-300/80">
              LFN / Null&apos;s Brawl
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
              LFN, le futur de l&apos;e-sport Null&apos;s Brawl
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/matchs" variant="secondary">
              Matchs
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <img
                src="https://media.discordapp.net/attachments/1434252768633290952/1458528708120940686/image-Photoroom_1.png?ex=695ff836&is=695ea6b6&hm=a746f26711c62f9e67af9450f64fd1727801e0de5d5e325154afec473340a464&=&format=webp&quality=lossless&width=771&height=514"
                alt="Logo LFN"
                className="h-14 w-auto"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">
                  Logo officiel
                </p>
                <p className="text-sm text-white">LFN en avant</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSF2RWpJDZbMl6fVN6nD0cJXwNbq3v7LH1PLA&s"
                alt="Null's Brawl"
                className="h-14 w-14 rounded-2xl object-cover"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  Jeu officiel
                </p>
                <p className="text-sm text-white">Null&apos;s Brawl</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-10 mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {motionCards.map((card) => (
            <div key={card.title} className="motion-card motion-shimmer">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                {card.title}
              </p>
              <p className="mt-3 text-sm text-white">{card.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-slate-950/80 to-slate-950/80 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="space-y-4 text-slate-200">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-300/80">
            Rejoins NB League
          </p>
          <h2 className="text-3xl font-semibold text-white md:text-4xl">
            Le hub officiel de la communauté
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Tournois, annonces, ranks et discussions en temps réel.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              href="https://discord.gg/TONCODE"
              variant="secondary"
              external
            >
              Rejoindre le Discord
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <iframe
            title="Discord NB League"
            src="https://discord.com/widget?id=1236724293027496047&theme=dark"
            width="100%"
            height="520"
            allowTransparency={true}
            frameBorder="0"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            className="block h-[520px] w-full"
          />
        </div>
      </section>
    </div>
  );
}
