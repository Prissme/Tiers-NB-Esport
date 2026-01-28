"use client";

import { useEffect, useState } from "react";
import type { SiteSeason } from "../lib/site-types";

const fallbackSeason: SiteSeason = {
  id: "fallback",
  name: "LFN",
  startsAt: null,
  endsAt: null,
  status: "active",
};

const formatSeasonLabel = (season: SiteSeason | null) => {
  if (!season) return "Saison en cours";
  return `${season.name} — ${season.status === "active" ? "Saison active" : "Saison"}`;
};

export default function SeasonKicker() {
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
      {formatSeasonLabel(season)}
    </p>
  );
}
