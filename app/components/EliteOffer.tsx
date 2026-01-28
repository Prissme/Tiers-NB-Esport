import Image from "next/image";
import Button from "./Button";

const eliteImage =
  "https://media.discordapp.net/attachments/1434252768633290952/1465811030356660276/df6c60f6-2ffd-4747-917d-4c58e428f4e4.png?ex=697a7667&is=697924e7&hm=c06fe3a84779112d03799b7e1dfd1088c9aae66e23d100967b0b392cac8f6048&=&format=webp&quality=lossless&width=874&height=583";

export default function EliteOffer() {
  return (
    <section className="surface-dominant relative overflow-hidden bg-[#0b0f1a]/85 px-6 py-10 shadow-[0_30px_80px_-60px_rgba(8,12,22,0.9)] backdrop-blur-[20px] sm:px-10">
      <div className="absolute inset-0 bg-card-gradient opacity-70" />
      <div className="absolute inset-0 bg-noise opacity-30" />
      <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6 font-sekuya">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              ELITE — le cercle prestige
            </h2>
            <p className="text-sm text-muted sm:text-base">
              Un accès premium pour vivre la LFN au plus près.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-slate-200 sm:text-base">
            <li className="flex items-start gap-3">
              <span className="text-base text-utility" aria-hidden="true">
                •
              </span>
              Coaching hebdomadaire (vendredi)
            </li>
            <li className="flex items-start gap-3">
              <span className="text-base text-utility" aria-hidden="true">
                •
              </span>
              Accès en entractes pendant les casts
            </li>
            <li className="flex items-start gap-3">
              <span className="text-base text-utility" aria-hidden="true">
                •
              </span>
              Votes des MAPS &amp; du MVP
            </li>
          </ul>
          <div className="space-y-3">
            <Button href="https://ko-fi.com/prissme" variant="primary" external>
              Rejoindre ELITE — 4,99€/mois
            </Button>
            <p className="text-xs uppercase tracking-[0.24em] text-utility">
              Accès réservé aux membres engagés.
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[14px] bg-[#0b111f]/80">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(12,20,44,0.4),rgba(10,15,26,0.05))]" />
          <Image
            src={eliteImage}
            alt="Visuel ELITE — cercle prestige"
            width={874}
            height={583}
            className="relative z-10 h-full w-full object-cover saturate-[0.9]"
            loading="lazy"
            quality={80}
            sizes="(min-width: 1024px) 40vw, 90vw"
          />
        </div>
      </div>
    </section>
  );
}
