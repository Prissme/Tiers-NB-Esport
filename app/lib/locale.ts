export type Locale = "fr" | "en";

export const LOCALE_COOKIE = "lfn-locale";

export const isLocale = (value?: string | null): value is Locale =>
  value === "fr" || value === "en";
