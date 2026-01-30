import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./locale";

export type { Locale } from "./locale";
export { LOCALE_COOKIE, isLocale } from "./locale";

export const getLocale = (): Locale => {
  const stored = cookies().get(LOCALE_COOKIE)?.value;
  return stored === "en" ? "en" : "fr";
};
