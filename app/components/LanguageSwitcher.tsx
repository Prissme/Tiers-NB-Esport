"use client";

import { LOCALE_COOKIE, type Locale } from "../lib/i18n";

const options: Array<{ label: string; value: Locale }> = [
  { label: "FR", value: "fr" },
  { label: "EN", value: "en" },
];

const buildCookieValue = (locale: Locale) =>
  `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const handleSwitch = (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    document.cookie = buildCookieValue(nextLocale);
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 text-[10px] uppercase tracking-[0.3em] text-utility">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleSwitch(option.value)}
          className={`rounded-full px-3 py-1 transition ${
            locale === option.value ? "bg-white/10 text-white" : "text-utility"
          }`}
          aria-pressed={locale === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
