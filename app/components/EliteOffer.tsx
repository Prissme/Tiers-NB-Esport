import Image from "next/image";
import Button from "./Button";

const eliteImage =
  "https://media.discordapp.net/attachments/1434252768633290952/1463542525611475017/content.png?ex=69738731&is=697235b1&hm=273ea21094c2de075d86e4f8fbfa4b2c92d68ef260f33f24ae0ffa4ea8811939&=&format=webp&quality=lossless&width=874&height=583";

export default function EliteOffer() {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-card backdrop-blur-[24px] sm:p-8">
      <div className="absolute inset-0 bg-card-gradient opacity-80" />
      <div className="absolute inset-0 bg-noise opacity-30" />
      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0b111f]/80 shadow-[0_30px_70px_-40px_rgba(8,12,22,0.9)]">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(12,20,44,0.4),rgba(10,15,26,0.05))]" />
          <Image
            src={eliteImage}
            alt="Visuel ELITE LFN"
            width={874}
            height={583}
            className="relative z-10 h-full w-full object-cover saturate-[0.85]"
            loading="lazy"
          />
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="badge">Statut sur sélection</span>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              ELITE — Statut officiel, révocable
            </h2>
            <p className="text-sm text-slate-300 sm:text-base">Entrée possible. Maintien non garanti.</p>
          </div>
          <ul className="space-y-3 text-sm text-slate-200 sm:text-base">
            {[
              {
                title: "Tournois validés",
                description: "Accès après validation officielle.",
                icon: "🏆",
              },
              {
                title: "Débriefs encadrés",
                description: "Retours stricts. Aucune promesse de progression.",
                icon: "🎙️",
              },
              {
                title: "Vote MVP contrôlé",
                description: "Réservé aux statuts validés.",
                icon: "🗳️",
              },
              {
                title: "Compétitions sur sélection",
                description: "Accès après validation.",
                icon: "📊",
              },
              {
                title: "Suivi régulier",
                description: "Contrôle régulier. Tolérance minimale.",
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
              Sélection stricte. Critères internes.
            </p>
            <p className="text-xs text-white/60">
              ELITE est un statut, pas un droit. Révocable à tout moment.
            </p>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">
              La majorité des demandes sont refusées.
            </p>
            <Button href="https://forms.gle/pmo6Z2mRLptYMR1J7" variant="primary" external>
              Déposer une demande
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
