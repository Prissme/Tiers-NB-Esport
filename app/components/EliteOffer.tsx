import Image from "next/image";
import Button from "./Button";

const eliteImage =
  "https://media.discordapp.net/attachments/1434252768633290952/1463542525611475017/content.png?ex=69738731&is=697235b1&hm=273ea21094c2de075d86e4f8fbfa4b2c92d68ef260f33f24ae0ffa4ea8811939&=&format=webp&quality=lossless&width=874&height=583";

export default function EliteOffer() {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-card backdrop-blur-[24px] sm:p-8">
      <div className="absolute inset-0 bg-card-gradient opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-red-500/20" />
      <div className="absolute inset-0 bg-noise opacity-40" />
      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0b111f]/80 shadow-[0_30px_70px_-40px_rgba(8,12,22,0.9)]">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(12,20,44,0.55),rgba(10,15,26,0.05))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.2),transparent_50%)]" />
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
              Accès sur sélection, maintenu tant que les critères sont respectés.
              <br />
              Statut révocable : c&apos;est une candidature, pas un abonnement.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-slate-200 sm:text-base">
            {[
              {
                title: "Tournois ELITE only",
                description:
                  "Tournois réservés aux équipes ELITE, avec planning dédié.",
                icon: "🏆",
              },
              {
                title: "After-match vocaux LFN",
                description:
                  "Débrief vocal après match avec l&apos;équipe LFN quand disponible.",
                icon: "🎙️",
              },
              {
                title: "Vote officiel MVP",
                description:
                  "Accès au vote officiel MVP de la ligue.",
                icon: "🗳️",
              },
              {
                title: "Accès prioritaire compétitions",
                description:
                  "Priorité d&apos;inscription sur certaines compétitions LFN.",
                icon: "📊",
              },
              {
                title: "Débriefs stratégiques hebdo",
                description:
                  "Débriefs et retours stratégiques partagés chaque semaine.",
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
              Déposer une candidature ELITE
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
