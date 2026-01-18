import { getBaseUrl } from "./get-base-url";
import type { MatchGroup, SiteSeason, SiteStandingsRow, SiteTeam } from "./site-types";

export const fetchSiteTeams = async (seasonId?: string) => {
  const baseUrl = getBaseUrl();
  const params = new URLSearchParams();
  if (seasonId) {
    params.set("season", seasonId);
  }
  const response = await fetch(`${baseUrl}/api/site/teams?${params.toString()}`, {
    next: { revalidate: 30 },
  });
  if (!response.ok) {
    throw new Error("Unable to load teams");
  }
  const payload = (await response.json()) as { teams?: SiteTeam[] };
  return payload.teams ?? [];
};

export const fetchSiteMatches = async (params: {
  seasonId?: string;
  phase?: string;
  division?: string;
}) => {
  const baseUrl = getBaseUrl();
  const search = new URLSearchParams();
  if (params.seasonId) search.set("season", params.seasonId);
  if (params.phase) search.set("phase", params.phase);
  if (params.division) search.set("division", params.division);
  const response = await fetch(`${baseUrl}/api/site/matches?${search.toString()}`, {
    next: { revalidate: 30 },
  });
  if (!response.ok) {
    throw new Error("Unable to load matches");
  }
  const payload = (await response.json()) as { groups?: MatchGroup[] };
  return payload.groups ?? [];
};

export const fetchSiteStandings = async (params: {
  seasonId?: string;
  division?: string;
}) => {
  const baseUrl = getBaseUrl();
  const search = new URLSearchParams();
  if (params.seasonId) search.set("season", params.seasonId);
  if (params.division) search.set("division", params.division);
  const response = await fetch(`${baseUrl}/api/site/standings?${search.toString()}`, {
    next: { revalidate: 30 },
  });
  if (!response.ok) {
    throw new Error("Unable to load standings");
  }
  const payload = (await response.json()) as { standings?: SiteStandingsRow[] };
  return payload.standings ?? [];
};

export const fetchCurrentSeason = async () => {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/site/season/current`, {
    next: { revalidate: 60 },
  });
  if (!response.ok) {
    throw new Error("Unable to load season");
  }
  const payload = (await response.json()) as { season?: SiteSeason | null };
  return payload.season ?? null;
};
