"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import StandingsTable, { type StandingsRow } from "../components/StandingsTable";
import type { SiteStandingsRow, SiteTeam } from "../lib/site-types";
import { teams as fallbackTeams } from "../../src/data";
import type { Locale } from "../lib/i18n";
import ReloadingImage from "../components/ReloadingImage";



type PlayerStanding = {
  id: string;
  name: string;
  tier: string;
  points: number;
  countryCode?: string;
};

const tierImageByName: Record<string, string> = {
  "Tier S": "/TierS.webp",
  "Tier A": "/TierA.webp",
  "Tier B": "/TierB.webp",
  "Tier C": "/TierC.webp",
  "Tier D": "/TierD.webp",
  "Tier E": "/TierE.webp",
};

const getCountryCode = (countryCode?: string) => {
  const normalized = String(countryCode ?? "FR").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "UN";
};

const getDisplayedTier = (player: PlayerStanding) => {
  if (player.points <= 0) return "No tier";
  return player.tier;
};

const mapFallbackTeams = (): SiteTeam[] =>
  fallbackTeams.map((team) => ({
    id: team.id,
    name: team.name,
    tag: null,
    division: team.division,
    logoUrl: team.logoUrl,
  }));

const getPoints = (row: SiteStandingsRow) => {
  const points = row.setsWon ?? row.pointsSets ?? row.pointsTotal ?? 0;
  return Math.max(0, points);
};

const toStandingsRows = (standings: SiteStandingsRow[]): StandingsRow[] =>
  standings.map((row) => ({
    teamId: row.teamId,
    teamName: row.teamName,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    points: getPoints(row),
    matchesPlayed: (row.wins ?? 0) + (row.losses ?? 0),
  }));

const sortStandings = (rows: StandingsRow[]) =>
  [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.teamId.localeCompare(b.teamId, "fr");
  });

const copy = {
  fr: {
    info: "Information",
    comingTitle: "Publication à venir",
    comingDescription: "Programme public pendant la validation.",
    comingNote:
      "Résultats non publics. Classement publié après validation de l'organisation.",
    standingsKicker: "Classement",
    standingsTitle: "Classement officiel",
    standingsFallback: "Liste des équipes enregistrées.",
    standingsOfficial: "Publication officielle.",
    fallbackData: "Données de secours (Supabase vide)",
    gold: "Or",
    silver: "Argent",
    bronze: "Bronze",
    points: "Points",
    pointsShort: "pts",
    playersKicker: "Joueurs",
    playersTitle: "Top joueurs",
    playersDescription: "Classement des joueurs avec rôle de tier.",
    playerName: "Pseudo",
    playerTier: "Tier",
    countryRankingTitle: "Classement par pays",
    countryRankingDescription: "Somme des points des joueurs actifs par pays.",
    country: "Pays",
    playersCount: "Joueurs",
    emptyPlayers: "Aucun joueur tier enregistré.",
  },
  en: {
    info: "Information",
    comingTitle: "Publication coming soon",
    comingDescription: "Public schedule during validation.",
    comingNote:
      "Results are private. Standings published after organization validation.",
    standingsKicker: "Standings",
    standingsTitle: "Official standings",
    standingsFallback: "List of registered teams.",
    standingsOfficial: "Official publication.",
    fallbackData: "Fallback data (empty Supabase)",
    gold: "Gold",
    silver: "Silver",
    bronze: "Bronze",
    points: "Points",
    pointsShort: "pts",
    playersKicker: "Players",
    playersTitle: "Top players",
    playersDescription: "Ranking of players with a tier role.",
    playerName: "Nickname",
    playerTier: "Tier",
    countryRankingTitle: "Country leaderboard",
    countryRankingDescription: "Total points of active players by country.",
    country: "Country",
    playersCount: "Players",
    emptyPlayers: "No tier players found.",
  },
};

export default function StandingsClient({ locale }: { locale: Locale }) {
  const content = copy[locale];
  const [standings, setStandings] = useState<SiteStandingsRow[]>([]);
  const [teams, setTeams] = useState<SiteTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "fallback">("supabase");
  const [activeDivision, setActiveDivision] = useState<string | null>(null);
  const [playerStandings, setPlayerStandings] = useState<PlayerStanding[]>([]);

  const teamFallbackStandings = useMemo<SiteStandingsRow[]>(() => {
    return teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      teamTag: team.tag ?? null,
      division: team.division ?? "D1",
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      pointsSets: 0,
      pointsAdmin: 0,
      pointsTotal: 0,
    }));
  }, [teams]);

  const standingsToDisplay = standings.length > 0 ? standings : teamFallbackStandings;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const seasonResponse = await fetch("/api/site/season/current", { cache: "no-store" });
        const seasonPayload = (await seasonResponse.json()) as { season?: { id?: string } };
        const seasonId = seasonPayload.season?.id;
        const query = seasonId ? `?season=${seasonId}` : "";

        const fetchStandingsAndTeams = async (suffix: string) => {
          const [standingsResponse, teamsResponse] = await Promise.all([
            fetch(`/api/site/standings${suffix}`, { cache: "no-store" }),
            fetch(`/api/site/teams${suffix}`, { cache: "no-store" }),
          ]);
          const standingsPayload = (await standingsResponse.json()) as {
            standings?: SiteStandingsRow[];
          };
          const teamsPayload = (await teamsResponse.json()) as { teams?: SiteTeam[] };
          return {
            standings: standingsPayload.standings ?? [],
            teams: teamsPayload.teams ?? [],
          };
        };

        const [{ standings: seasonStandings, teams: seasonTeams }, playerStandingsResponse] =
          await Promise.all([
            fetchStandingsAndTeams(query),
            fetch("/api/site/player-standings", { cache: "no-store" }),
          ]);
        const playersPayload = (await playerStandingsResponse.json()) as {
          players?: PlayerStanding[];
        };

        const shouldRetryWithoutSeason =
          Boolean(query) && seasonStandings.length === 0 && seasonTeams.length === 0;
        const { standings: nextStandings, teams: nextTeams } = shouldRetryWithoutSeason
          ? await fetchStandingsAndTeams("")
          : { standings: seasonStandings, teams: seasonTeams };

        if (mounted) {
          if (nextStandings.length === 0 && nextTeams.length === 0) {
            setTeams(mapFallbackTeams());
            setSource("fallback");
            setPlayerStandings(playersPayload.players ?? []);
          } else {
            setStandings(nextStandings);
            setTeams(nextTeams.length ? nextTeams : mapFallbackTeams());
            setPlayerStandings(playersPayload.players ?? []);
          }
        }
      } catch (error) {
        console.error("standings load error", error);
        if (mounted) {
          setTeams(mapFallbackTeams());
          setSource("fallback");
          setPlayerStandings([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    const refreshInterval = window.setInterval(load, 15000);
    return () => {
      mounted = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  const { standingsByDivision, teamsById } = useMemo(() => {
    const teamsMap = Object.fromEntries(teams.map((team) => [team.id, team]));
    const grouped = standingsToDisplay.reduce<Record<string, SiteStandingsRow[]>>((acc, row) => {
      const division = row.division ?? "D1";
      if (!acc[division]) acc[division] = [];
      acc[division].push(row);
      return acc;
    }, {});

    return { standingsByDivision: grouped, teamsById: teamsMap };
  }, [standingsToDisplay, teams]);

  const availableDivisions = useMemo(() => {
    const keys = Object.keys(standingsByDivision);
    const preferred = ["D1", "D2"];
    const preferredOrder = preferred.filter((division) => keys.includes(division));
    const remaining = keys.filter((division) => !preferred.includes(division)).sort();
    return [...preferredOrder, ...remaining];
  }, [standingsByDivision]);

  useEffect(() => {
    if (availableDivisions.length === 0) {
      setActiveDivision(null);
      return;
    }
    if (!activeDivision || !availableDivisions.includes(activeDivision)) {
      setActiveDivision(availableDivisions[0]);
    }
  }, [availableDivisions, activeDivision]);

  const topPlayers = useMemo(() => playerStandings.slice(0, 50), [playerStandings]);
  const countryLeaderboard = useMemo(() => {
    const byCountry = new Map<string, { code: string; points: number; players: number }>();
    for (const player of playerStandings) {
      const code = getCountryCode(player.countryCode);
      const current = byCountry.get(code) ?? { code, points: 0, players: 0 };
      current.points += player.points;
      current.players += 1;
      byCountry.set(code, current);
    }
    return [...byCountry.values()]
      .sort((a, b) => b.points - a.points || b.players - a.players || a.code.localeCompare(b.code))
      .slice(0, 15);
  }, [playerStandings]);

  if (loading) {
    return (
      <section className="section-card dominant-section space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-6 w-48" />
        </div>
        <div className="motion-card h-48" />
      </section>
    );
  }

  if (standingsToDisplay.length === 0) {
    return (
      <section className="section-card dominant-section space-y-4">
        <SectionHeader
          kicker={content.info}
          title={content.comingTitle}
          description={content.comingDescription}
          tone="dominant"
        />
        <p className="text-sm text-muted">{content.comingNote}</p>
      </section>
    );
  }

  return (
    <section className="section-card dominant-section space-y-10 border-0 bg-white/[0.03]">
      <div className="space-y-4">
        <SectionHeader
          kicker={content.playersKicker}
          title={content.playersTitle}
          description={content.playersDescription}
          tone="dominant"
        />
        <div className="grid items-end gap-4 md:grid-cols-3">
          {[1, 0, 2].map((podiumIndex) => {
            const player = topPlayers[podiumIndex];
            if (!player) return <div key={`featured-empty-${podiumIndex}`} />;
            const tierLabel = getDisplayedTier(player);
            const tierImage = tierImageByName[player.tier] ?? "/TierE.webp";
            const glow =
              podiumIndex === 0
                ? "from-amber-300/45 via-amber-100/20 to-transparent"
                : podiumIndex === 1
                  ? "from-slate-300/45 via-slate-100/20 to-transparent"
                  : "from-amber-700/45 via-amber-900/20 to-transparent";
            const rankBadgeStyle =
              podiumIndex === 0
                ? "bg-amber-300 text-black"
                : podiumIndex === 1
                  ? "bg-slate-200 text-slate-900"
                  : "bg-amber-800 text-amber-100";
            const heightClass =
              podiumIndex === 0
                ? "min-h-[260px] md:min-h-[320px]"
                : podiumIndex === 1
                  ? "min-h-[220px] md:min-h-[280px]"
                  : "min-h-[200px] md:min-h-[250px]";
            return (
              <div
                key={`featured-${player.id}`}
                className={`relative flex flex-col justify-end overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br ${glow} ${heightClass} p-6 shadow-[0_25px_60px_-40px_rgba(0,0,0,0.9)]`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_60%)]" />
                <div className="absolute inset-x-0 bottom-0 h-10 bg-white/10" />
                <div className="relative z-10 space-y-4 pb-5 text-center">
                  <div
                    className={`mx-auto inline-flex items-center justify-center rounded-full px-4 py-1 text-[10px] uppercase tracking-[0.35em] ${rankBadgeStyle}`}
                  >
                    #{podiumIndex + 1}
                  </div>
                  <div className="mx-auto">
                    <p className="text-lg font-semibold text-white">{player.name}</p>
                    <p className="text-sm text-white/70">
                      <img
                        src={`https://flagcdn.com/w40/${getCountryCode(player.countryCode).toLowerCase()}.png`}
                        alt={getCountryCode(player.countryCode)}
                        className="mr-2 inline-block h-4 w-6 rounded-sm object-cover align-middle"
                        loading="lazy"
                      />
                      {getCountryCode(player.countryCode)}
                    </p>
                  </div>
                  <div className="mx-auto flex flex-col items-center gap-2">
                    <ReloadingImage
                      src={tierImage}
                      alt={tierLabel}
                      className="h-20 w-20 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.4)]"
                      loading="lazy"
                    />
                    <span className="text-xs uppercase tracking-[0.2em] text-white/70">
                      {tierLabel}
                    </span>
                    <p className="text-sm font-semibold text-white/90">
                      {player.points} {content.pointsShort}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
          <table className="surface-table min-w-full text-sm text-white/80">
            <thead className="surface-table__header text-xs uppercase text-white/40">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">{content.playerName}</th>
                <th className="px-3 py-2 text-left">Pays</th>
                <th className="px-3 py-2 text-left">{content.playerTier}</th>
                <th className="px-3 py-2 text-left">{content.points}</th>
              </tr>
            </thead>
            <tbody>
              {topPlayers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-white/40">
                    {content.emptyPlayers}
                  </td>
                </tr>
              ) : (
                topPlayers.map((player, index) => (
                  <tr key={player.id} className="surface-table__row">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 text-white/90">{player.name}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://flagcdn.com/w40/${getCountryCode(player.countryCode).toLowerCase()}.png`}
                          alt={getCountryCode(player.countryCode)}
                          className="h-4 w-6 rounded-sm object-cover"
                          loading="lazy"
                        />
                        <span>{getCountryCode(player.countryCode)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ReloadingImage
                          src={tierImageByName[player.tier] ?? "/TierE.webp"}
                          alt={getDisplayedTier(player)}
                          className="h-8 w-8 object-contain"
                          loading="lazy"
                        />
                        <span>{getDisplayedTier(player)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-semibold">{player.points}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {countryLeaderboard.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">{content.countryRankingTitle}</p>
              <p className="text-xs text-white/60">{content.countryRankingDescription}</p>
            </div>
            <table className="surface-table min-w-full text-sm text-white/80">
              <thead className="surface-table__header text-xs uppercase text-white/40">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">{content.country}</th>
                  <th className="px-3 py-2 text-left">{content.playersCount}</th>
                  <th className="px-3 py-2 text-left">{content.points}</th>
                </tr>
              </thead>
              <tbody>
                {countryLeaderboard.map((country, index) => (
                  <tr key={country.code} className="surface-table__row">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                          alt={country.code}
                          className="h-4 w-6 rounded-sm object-cover"
                          loading="lazy"
                        />
                        <span>{country.code}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{country.players}</td>
                    <td className="px-3 py-2 font-semibold">{country.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="signal-divider" />
      <SectionHeader
        kicker={content.standingsKicker}
        title={content.standingsTitle}
        description={standings.length === 0 ? content.standingsFallback : content.standingsOfficial}
        tone="dominant"
      />
      {source === "fallback" ? (
        <p className="text-xs uppercase tracking-[0.3em] text-utility">
          {content.fallbackData}
        </p>
      ) : null}
      {availableDivisions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          {availableDivisions.map((division) => {
            const isActive = division === activeDivision;
            return (
              <button
                key={division}
                type="button"
                onClick={() => setActiveDivision(division)}
                className={`division-toggle ${isActive ? "division-toggle--active" : ""}`}
              >
                {division}
              </button>
            );
          })}
        </div>
      ) : null}
      {(activeDivision ? [[activeDivision, standingsByDivision[activeDivision] ?? []]] : []).map(
        ([division, rows]) => {
          const standingsRows = sortStandings(toStandingsRows(rows));
          const podium = standingsRows.slice(0, 3);
          const fourth = standingsRows[3];
          const remainingRows = standingsRows.slice(fourth ? 4 : 3);
          const tableOffset = fourth ? 4 : podium.length;
          return (
            <div key={division} className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-utility">
                {division}
              </p>
              {podium.length > 0 ? (
                <div className="grid items-end gap-4 md:grid-cols-3">
                  {[1, 0, 2].map((index) => {
                    const row = podium[index];
                    if (!row) return <div key={`podium-empty-${index}`} />;
                    const team = teamsById[row.teamId];
                    const teamName = team?.name ?? row.teamName ?? row.teamId;
                    const logoUrl = team?.logoUrl ?? null;
                    const accent =
                      index === 0
                        ? "from-amber-300/30 via-amber-200/10 to-transparent"
                        : index === 1
                          ? "from-slate-300/30 via-slate-200/10 to-transparent"
                          : "from-amber-900/30 via-amber-800/10 to-transparent";
                    const badge =
                      index === 0
                        ? "bg-amber-300 text-black"
                        : index === 1
                          ? "bg-slate-200 text-slate-900"
                          : "bg-amber-800 text-amber-100";
                    const place =
                      index === 0 ? content.gold : index === 1 ? content.silver : content.bronze;
                    const heightClass =
                      index === 0
                        ? "min-h-[240px] md:min-h-[300px]"
                        : index === 1
                          ? "min-h-[210px] md:min-h-[260px]"
                          : "min-h-[185px] md:min-h-[240px]";
                    return (
                      <div
                        key={row.teamId}
                        className={`relative flex flex-col justify-end overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br ${accent} ${heightClass} p-6 text-center shadow-[0_25px_60px_-40px_rgba(0,0,0,0.9)]`}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
                        <div className="absolute inset-x-0 bottom-0 h-10 bg-white/10" />
                        <div className="relative z-10 space-y-4 pb-6">
                          <div
                            className={`mx-auto inline-flex items-center justify-center rounded-full px-4 py-1 text-[10px] uppercase tracking-[0.35em] ${badge}`}
                          >
                            {"<a:trophy:1393336054567665897>"} {place}
                          </div>
                          <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
                            {logoUrl ? (
                              <ReloadingImage
                                src={logoUrl}
                                alt={`Logo ${teamName}`}
                                className="h-full w-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-base font-semibold text-white">
                                {teamName.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-white">{teamName}</p>
                            <p className="text-xs uppercase tracking-[0.3em] text-utility">
                              {row.points} {content.pointsShort}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {fourth ? (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-white/10 bg-white/5 px-6 py-4 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.75)]">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-white">#4</span>
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[12px] bg-white/10">
                      {teamsById[fourth.teamId]?.logoUrl ? (
                        <ReloadingImage
                          src={teamsById[fourth.teamId]?.logoUrl ?? ""}
                          alt={`Logo ${teamsById[fourth.teamId]?.name ?? fourth.teamName}`}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-utility">
                          {(teamsById[fourth.teamId]?.name ?? fourth.teamName ?? fourth.teamId)
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">
                        {teamsById[fourth.teamId]?.name ?? fourth.teamName ?? fourth.teamId}
                      </p>
                      {teamsById[fourth.teamId]?.tag ? (
                        <p className="text-xs uppercase tracking-[0.3em] text-utility">
                          {teamsById[fourth.teamId]?.tag}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm uppercase tracking-[0.3em] text-utility">
                      {content.points}
                    </p>
                    <p className="text-xl font-semibold text-white">
                      {fourth.points} {content.pointsShort}
                    </p>
                  </div>
                </div>
              ) : null}
              <StandingsTable
                rows={remainingRows}
                teamsById={teamsById}
                rankOffset={tableOffset}
                locale={locale}
              />
            </div>
          );
        }
      )}
    </section>
  );
}
