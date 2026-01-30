"use client";

import { useEffect, useState } from "react";
import type { SiteSeason } from "../lib/site-types";
import type { Locale } from "../lib/i18n";

const fallbackSeason: SiteSeason = {
  id: "fallback",
  name: "LFN",
  startsAt: null,
  endsAt: null,
  status: "active",
};

const formatSeasonLabel = (season: SiteSeason | null, locale: Locale) => {
  const copy = {
    fr: {
      current: "Saison en cours",
      active: "Saison active",
      season: "Saison",
    },
    en: {
      current: "Current season",
      active: "Active season",
      season: "Season",
    },
  }[locale];
  if (!season) return copy.current;
  return `${season.name} — ${season.status === "active" ? copy.active : copy.season}`;
};

export default function SeasonKicker({ locale }: { locale: Locale }) {
  const [season, setSeason] = useState<SiteSeason | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch("/api/site/season/current", { cache: "no-store" });
        const payload = (await response.json()) as { season?: SiteSeason | null };
        if (mounted) {
          setSeason(payload.season ?? fallbackSeason);
        }
      } catch (error) {
        console.error("season load error", error);
        if (mounted) {
          setSeason(fallbackSeason);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="skeleton h-4 w-52" />;
  }

  return (
    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-utility">
      {formatSeasonLabel(season, locale)}
    </p>
  );
}
