import type { Locale } from "../lib/i18n";
import ReloadingImage from "./ReloadingImage";

const copy = {
  fr: {
    logoAlt: "Logo LFN",
    rights: "Tous droits réservés.",
    rules: "Règlement",
    matches: "Matchs",
    standings: "Classement",
  },
  en: {
    logoAlt: "LFN logo",
    rights: "All rights reserved.",
    rules: "Rules",
    matches: "Matches",
    standings: "Standings",
  },
};

export default function Footer({ locale }: { locale: Locale }) {
  const content = copy[locale];
  return (
    <footer className="relative z-10 bg-[#070a12]/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-10 text-sm text-utility sm:px-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/5">
              <ReloadingImage
                src="https://media.discordapp.net/attachments/1434252768633290952/1466093575224819904/image-Photoroom_12.png?ex=697e208b&is=697ccf0b&hm=e4e4f3b232300dacbd0adae61a9c2bfcbd044a1e6d3130b152eb67641b42f047&=&format=webp&quality=lossless&width=331&height=325"
                alt={content.logoAlt}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </span>
          </div>
          <p className="text-xs text-utility">
            © {new Date().getFullYear()} LFN. {content.rights}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.3em]">
          <a
            href="/reglement"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12]"
          >
            {content.rules}
          </a>
          <a
            href="/matchs"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12]"
          >
            {content.matches}
          </a>
          <a
            href="/classement"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12]"
          >
            {content.standings}
          </a>
        </div>
      </div>
    </footer>
  );
}
