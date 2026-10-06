import "server-only";

const INTERNAL_HOST = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/i;

/**
 * Origine publique du site (ex: https://www.lfn-esports.fr) telle que vue par le visiteur.
 *
 * On la déduit des en-têtes de la requête (x-forwarded-host / host) plutôt que de
 * NEXT_PUBLIC_SITE_URL : si cette variable est fausse sur Koyeb (ex: ancien domaine
 * *.koyeb.app), le login renvoyait les gens sur un domaine qui ne répond pas.
 * La variable ne sert que de secours si les en-têtes ne donnent qu'un hôte interne.
 */
export function getRequestOrigin(request: Request): string {
  const first = (value: string | null) => value?.split(",")[0]?.trim() || "";

  const host = first(request.headers.get("x-forwarded-host")) || first(request.headers.get("host"));

  if (host && !INTERNAL_HOST.test(host)) {
    const proto = first(request.headers.get("x-forwarded-proto")) || "https";
    return `${proto}://${host}`;
  }

  // Dev local (localhost) ou hôte interne : on prend l'URL de la requête telle quelle en local,
  // sinon la variable d'environnement en dernier recours.
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (host && INTERNAL_HOST.test(host) && host.startsWith("localhost")) {
    return new URL(request.url).origin;
  }
  return fromEnv || new URL(request.url).origin;
}
