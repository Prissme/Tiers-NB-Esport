"use client";

const coverExtensions = ["png", "webp", "jpg", "jpeg"] as const;
const coverCache = new Map<string, Promise<string | null>>();

export function getTeamCoverSrc(slug: string) {
  if (coverCache.has(slug)) {
    return coverCache.get(slug) as Promise<string | null>;
  }

  const fetchCover = (async () => {
    for (const extension of coverExtensions) {
      const src = `/images/teams/${slug}/cover.${extension}`;

      try {
        const response = await fetch(src, { method: "HEAD" });
        if (response.ok) {
          return src;
        }
      } catch {
        // Ignore network errors and try the next extension.
      }
    }

    return null;
  })();

  coverCache.set(slug, fetchCover);
  return fetchCover;
}
