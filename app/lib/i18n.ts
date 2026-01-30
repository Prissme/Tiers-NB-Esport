import { cookies } from "next/headers";

export type Locale = "fr" | "en";

export const LOCALE_COOKIE = "lfn-locale";

export const getLocale = (): Locale => {
  const stored = cookies().get(LOCALE_COOKIE)?.value;
  return stored === "en" ? "en" : "fr";
};

export const isLocale = (value?: string | null): value is Locale =>
  value === "fr" || value === "en";
