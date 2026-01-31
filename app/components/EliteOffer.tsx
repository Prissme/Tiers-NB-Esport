import Image from "next/image";
import Button from "./Button";
import type { Locale } from "../lib/i18n";

const eliteImage = "/VisuelElite.webp";

const copy = {
  fr: {
    title: "ELITE — BEST DEAL",
    description: "Un accès premium pour vivre la LFN au plus près.",
    perks: [
      "Coaching hebdomadaire (vendredi)",
      "Accès en entractes pendant les casts",
      "Votes des MAPS & du MVP",
    ],
    cta: "Rejoindre ELITE — 4,99€/mois",
    note: "Accès réservé aux membres engagés.",
    imageAlt: "Visuel ELITE — best deal",
  },
  en: {
    title: "ELITE — BEST DEAL",
    description: "Premium access to experience LFN from up close.",
    perks: [
      "Weekly coaching (Friday)",
      "Intermission access during casts",
      "MAPS & MVP voting rights",
    ],
    cta: "Join ELITE — €4.99/month",
    note: "Access reserved for committed members.",
    imageAlt: "ELITE — best deal visual",
  },
};

export default function EliteOffer({ locale }: { locale: Locale }) {
  const content = copy[locale];
  return (
    <section className="surface-dominant relative overflow-hidden bg-[#0b0f1a]/85 px-6 py-10 shadow-[0_30px_80px_-60px_rgba(8,12,22,0.9)] backdrop-blur-[20px] sm:px-10">
      <div className="absolute inset-0 bg-card-gradient opacity-70" />
      <div className="absolute inset-0 bg-noise opacity-30" />
      <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-sekuya text-[1.4rem] font-semibold tracking-tight text-white sm:text-3xl">
              <span className="bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
                {content.title}
              </span>
            </h2>
            <p className="text-sm text-muted sm:text-base">
              {content.description}
            </p>
          </div>
          <ul className="space-y-3 text-sm text-slate-200 sm:text-base">
            {content.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3">
                <span className="text-base text-utility" aria-hidden="true">
                  •
                </span>
                {perk}
              </li>
            ))}
          </ul>
          <div className="space-y-3">
            <Button href="https://ko-fi.com/prissme" variant="primary" external>
              {content.cta}
            </Button>
            <p className="text-xs uppercase tracking-[0.24em] text-utility">
              {content.note}
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[14px] bg-[#0b111f]/80">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(12,20,44,0.4),rgba(10,15,26,0.05))]" />
          <div className="relative z-10 aspect-[4/3] w-full sm:aspect-[16/10] lg:aspect-auto lg:h-full">
            <Image
              src={eliteImage}
              alt={content.imageAlt}
              width={874}
              height={583}
              className="h-full w-full object-cover saturate-[0.9]"
              loading="lazy"
              quality={80}
              sizes="(min-width: 1024px) 40vw, 100vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
