import Image from "next/image";
import Button from "./Button";

const eliteImage =
  "https://media.discordapp.net/attachments/1434252768633290952/1463542525611475017/content.png?ex=697235b1&is=6970e431&hm=babdefcfced523453a9292d9a73cb52e53667b762a855f55e1aee0b5d4c9f5de&=&format=webp&quality=lossless&width=874&height=583";

export default function EliteOffer() {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-card backdrop-blur-[24px] sm:p-8">
      <div className="absolute inset-0 bg-card-gradient opacity-90" />
      <div className="absolute inset-0 bg-noise opacity-40" />
      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0b111f]/80 shadow-[0_30px_70px_-40px_rgba(8,12,22,0.9)]">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(10,15,26,0.45),rgba(10,15,26,0.05))]" />
          <Image
            src={eliteImage}
            alt="Offre Elite LFN"
            width={874}
            height={583}
            className="relative z-10 h-full w-full object-cover saturate-[0.9]"
            loading="lazy"
          />
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="badge">Programme exclusif</span>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              ELITE — Le cercle visible de la LFN
            </h2>
            <p className="text-sm text-slate-300 sm:text-base">
              Accès sur sélection, conservé tant que le niveau est imposé.
              <br />
              Statut révocable : c&apos;est une candidature, pas un abonnement.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-slate-200 sm:text-base">
            {[
              {
                title: "Tournois ELITE only",
                description:
                  "Vous devenez l&apos;image visible des matchs les plus intenses de la ligue.",
                icon: "🏆",
              },
              {
                title: "After-match vocaux LFN",
                description:
                  "Vous accédez au backstage et devenez une voix entendue par les casters.",
                icon: "🎙️",
              },
              {
                title: "Vote officiel MVP",
                description:
                  "Vous influencez la reconnaissance officielle des performances de la LFN.",
                icon: "🗳️",
              },
              {
                title: "Accès prioritaire compétitions",
                description:
                  "Vous devenez prioritaire sur les opportunités qui comptent.",
                icon: "📊",
              },
              {
                title: "Débriefs stratégiques hebdo",
                description:
                  "Vous intégrez la lecture officielle de la ligue, chaque semaine.",
                icon: "🎥",
              },
            ].map((item) => (
              <li
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/5 p-3"
              >
                <span className="text-base" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="space-y-1">
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="text-sm text-slate-300">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">
              Badge ELITE visible sur les classements et pages d&apos;équipes.
            </p>
            <p className="text-xs text-white/60">
              ELITE est un statut, pas un droit. L&apos;accès peut être refusé ou retiré.
            </p>
            <Button href="https://ko-fi.com/prissme" variant="primary" external>
              Candidater à ELITE
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
