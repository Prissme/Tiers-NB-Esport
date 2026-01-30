import type { Locale } from "../lib/i18n";

const copy = {
  fr: "Pré-saison",
  en: "Pre-season",
};

export default function PreSeasonBanner({
  message,
  locale,
}: {
  message: string;
  locale: Locale;
}) {
  return (
    <div className="rounded-[12px] bg-white/5 px-6 py-4 text-sm text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-utility">{copy[locale]}</p>
      <p className="mt-2 text-sm text-muted">{message}</p>
    </div>
  );
}
