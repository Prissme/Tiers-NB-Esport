"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SectionHeader from "../components/SectionHeader";
import type { Locale } from "../lib/i18n";
import ReloadingImage from "../components/ReloadingImage";
import { GlobeIcon } from "../components/icons";



type PlayerStanding = {
  id: string;
  slug?: string | null;
  discordId?: string | null;
  name: string;
  tier: string;
  points: number;
  countryCode?: string;
  description?: string;
  inactivityPenalty?: number;
  teamId?: string | null;
  teamName?: string | null;
  teamTag?: string | null;
  earnings?: number;
  winStreak?: number;
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

// "ZZ" = pays non spécifié (joueur inscrit via le login Discord, pas encore de pays)
const UNSPECIFIED_COUNTRY = "ZZ";

const toFlagEmoji = (countryCode?: string) => {
  const code = getCountryCode(countryCode);
  if (code === UNSPECIFIED_COUNTRY || !/^[A-Z]{2}$/.test(code)) {
    return "";
  }
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
};

const getDisplayedTier = (player: PlayerStanding) => {
  if (player.points <= 0) return "No tier";
  return player.tier;
};

const copy = {
  fr: {
    info: "Information",
    comingTitle: "Publication à venir",
    comingDescription: "Programme public pendant la validation.",
    comingNote:
      "Résultats non publics. Classement publié après validation de l'organisation.",
    points: "Points",
    pointsShort: "pts",
    playersKicker: "Joueurs",
    playersTitle: "Top joueurs",
    playersDescription: "Classement des joueurs avec rôle de tier.",
    playerName: "Pseudo",
    playerTier: "Tier",
    playerTeam: "Équipe",
    countryRankingTitle: "Classement par pays",
    countryRankingDescription:
      "Points pondérés : 1er joueur ×1, 2e ×1/2, 3e ×1/4, etc.",
    country: "Pays",
    playersCount: "Joueurs",
    emptyPlayers: "Aucun joueur tier enregistré.",
    filterCountry: "Pays",
    filterTier: "Tier",
    allCountries: "Tous les pays",
    allTiers: "Tous les tiers",
    playerDescriptionFallback: "Aucune description pour ce joueur.",
    earningsLabel: "Gains",
    close: "Fermer",
    searchPlayerPlaceholder: "Rechercher un joueur…",
    previousPage: "Précédent",
    nextPage: "Suivant",
    page: "Page",
    freeAgent: "F/A",
  },
  en: {
    info: "Information",
    comingTitle: "Publication coming soon",
    comingDescription: "Public schedule during validation.",
    comingNote:
      "Results are private. Standings published after organization validation.",
    points: "Points",
    pointsShort: "pts",
    playersKicker: "Players",
    playersTitle: "Top players",
    playersDescription: "Ranking of players with a tier role.",
    playerName: "Nickname",
    playerTier: "Tier",
    playerTeam: "Team",
    countryRankingTitle: "Country leaderboard",
    countryRankingDescription:
      "Weighted points: 1st player ×1, 2nd ×1/2, 3rd ×1/4, etc.",
    country: "Country",
    playersCount: "Players",
    emptyPlayers: "No tier players found.",
    filterCountry: "Country",
    filterTier: "Tier",
    allCountries: "All countries",
    allTiers: "All tiers",
    playerDescriptionFallback: "No description available for this player.",
    earningsLabel: "Earnings",
    close: "Close",
    searchPlayerPlaceholder: "Search player…",
    previousPage: "Previous",
    nextPage: "Next",
    page: "Page",
    freeAgent: "F/A",
  },
};

export default function StandingsClient({ locale }: { locale: Locale }) {
  const content = copy[locale];
  const [loading, setLoading] = useState(true);
  const [playerStandings, setPlayerStandings] = useState<PlayerStanding[]>([]);
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [playerSearch, setPlayerSearch] = useState("");
  const [playersPage, setPlayersPage] = useState(1);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const playerStandingsResponse = await fetch("/api/site/player-standings", {
          cache: "no-store",
        });
        // Erreur serveur (ex. base de données en timeout) : on garde le classement déjà affiché
        // au lieu de le vider, et on réessaie au prochain rafraîchissement
        if (!playerStandingsResponse.ok) {
          throw new Error(`standings request failed (${playerStandingsResponse.status})`);
        }
        const playersPayload = (await playerStandingsResponse.json()) as {
          players?: PlayerStanding[];
        };
        if (mounted) {
          setPlayerStandings(playersPayload.players ?? []);
        }
      } catch (error) {
        console.error("standings load error", error);
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

  const availableCountries = useMemo(() => {
    const values = new Set(playerStandings.map((player) => getCountryCode(player.countryCode)));
    values.add("GB");
    values.add("BG");
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [playerStandings]);
  const availableTiers = useMemo(() => {
    const values = new Set(playerStandings.map((player) => player.tier));
    const order = ["Tier S", "Tier A", "Tier B", "Tier C", "Tier D", "Tier E"];
    return [...values].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [playerStandings]);
  const filteredPlayers = useMemo(
    () =>
      playerStandings.filter((player) => {
        const countryOk =
          selectedCountry === "ALL" || getCountryCode(player.countryCode) === selectedCountry;
        const tierOk = selectedTier === "ALL" || player.tier === selectedTier;
        const searchOk =
          playerSearch.trim().length === 0 ||
          player.name.toLowerCase().includes(playerSearch.trim().toLowerCase());
        return countryOk && tierOk && searchOk;
      }),
    [playerStandings, selectedCountry, selectedTier, playerSearch]
  );
  const topPlayers = useMemo(() => {
    const pageSize = 50;
    const start = (playersPage - 1) * pageSize;
    return filteredPlayers.slice(start, start + pageSize);
  }, [filteredPlayers, playersPage]);
  const totalPlayersPages = Math.max(1, Math.ceil(filteredPlayers.length / 50));

  useEffect(() => {
    setPlayersPage(1);
  }, [selectedCountry, selectedTier, playerSearch]);

  useEffect(() => {
    if (playersPage > totalPlayersPages) {
      setPlayersPage(totalPlayersPages);
    }
  }, [playersPage, totalPlayersPages]);
  const countryLeaderboard = useMemo(() => {
    // Même système pondéré que le bot Discord (world-country-leaderboard.js) :
    // points du pays = Top1 × (1/2)^0 + Top2 × (1/2)^1 + Top3 × (1/2)^2 + ...
    // Calculé sur tous les joueurs (points > 0), indépendamment des filtres de la liste.
    const byCountry = new Map<string, number[]>();
    for (const player of playerStandings) {
      const pts = Number(player.points ?? 0);
      if (!Number.isFinite(pts) || pts <= 0) continue;
      const code = getCountryCode(player.countryCode);
      if (code === UNSPECIFIED_COUNTRY) continue; // pas de pays => pas dans le classement par pays
      const list = byCountry.get(code) ?? [];
      list.push(pts);
      byCountry.set(code, list);
    }
    return [...byCountry.entries()]
      .map(([code, list]) => {
        const sorted = [...list].sort((a, b) => b - a);
        const weighted = sorted.reduce((sum, pts, idx) => sum + pts * Math.pow(0.5, idx), 0);
        return { code, players: sorted.length, points: Math.round(weighted * 100) / 100 };
      })
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

  if (playerStandings.length === 0) {
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
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
          <div className="flex flex-wrap gap-2 border-b border-white/10 p-3">
            <select
              className="rounded-md border border-white/20 bg-black/30 px-2 py-1 text-xs text-white"
              value={selectedCountry}
              onChange={(event) => setSelectedCountry(event.target.value)}
            >
              <option value="ALL">
                {content.filterCountry}: {content.allCountries}
              </option>
              {availableCountries.map((country) => (
                <option key={country} value={country}>
                  {content.filterCountry}: {country === UNSPECIFIED_COUNTRY ? "—" : `${toFlagEmoji(country)} ${country}`.trim()}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-white/20 bg-black/30 px-2 py-1 text-xs text-white"
              value={selectedTier}
              onChange={(event) => setSelectedTier(event.target.value)}
            >
              <option value="ALL">
                {content.filterTier}: {content.allTiers}
              </option>
              {availableTiers.map((tier) => (
                <option key={tier} value={tier}>
                  {content.filterTier}: {tier}
                </option>
              ))}
            </select>
            <input
              type="search"
              className="min-w-[220px] rounded-md border border-white/20 bg-black/30 px-2 py-1 text-xs text-white placeholder:text-white/50"
              placeholder={content.searchPlayerPlaceholder}
              value={playerSearch}
              onChange={(event) => setPlayerSearch(event.target.value)}
            />
          </div>
          <table className="surface-table min-w-full text-sm text-white/80">
            <thead className="surface-table__header text-xs uppercase text-white/40">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">{content.playerName}</th>
                <th className="px-3 py-2 text-left">Pays</th>
                <th className="px-3 py-2 text-left">{content.playerTier}</th>
                <th className="px-3 py-2 text-left">{content.playerTeam}</th>
                <th className="px-3 py-2 text-left">{content.points}</th>
              </tr>
            </thead>
            <tbody>
              {topPlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-white/40">
                    {content.emptyPlayers}
                  </td>
                </tr>
              ) : (
                topPlayers.map((player, index) => {
                  const profileHref = player.slug
                    ? `/player/${player.slug}`
                    : player.discordId
                      ? `/player/${player.discordId}`
                      : null;
                  return (
                  <tr
                    key={player.id}
                    className={`surface-table__row ${profileHref ? "cursor-pointer" : ""} ${
                      index === 0
                        ? "bg-gradient-to-r from-amber-300/20 via-amber-200/10 to-transparent"
                        : index === 1
                          ? "bg-gradient-to-r from-slate-300/20 via-slate-200/10 to-transparent"
                          : index === 2
                            ? "bg-gradient-to-r from-amber-800/20 via-amber-700/10 to-transparent"
                            : ""
                    }`}
                    onClick={profileHref ? () => router.push(profileHref) : undefined}
                  >
                    <td className="px-3 py-2">{(playersPage - 1) * 50 + index + 1}</td>
                    <td className="px-3 py-2 text-white/90">
                      <div className="flex items-center gap-3">
                        {player.discordId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/site/avatar/${player.discordId}?size=64`}
                            alt=""
                            width={28}
                            height={28}
                            loading="lazy"
                            decoding="async"
                            className={`h-7 w-7 shrink-0 rounded-full bg-white/10 object-cover ring-1 ${
                              (playersPage - 1) * 50 + index === 0 ? "ring-amber-300/70" : "ring-white/15"
                            }`}
                            onError={(event) => {
                              event.currentTarget.style.visibility = "hidden";
                            }}
                          />
                        ) : (
                          <span className="h-7 w-7 shrink-0 rounded-full bg-white/10 ring-1 ring-white/15" aria-hidden="true" />
                        )}
                        {profileHref ? (
                          <a
                            href={profileHref}
                            onClick={(event) => event.stopPropagation()}
                            className="truncate hover:underline"
                          >
                            {player.name}
                          </a>
                        ) : (
                          <span className="truncate">{player.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {getCountryCode(player.countryCode) === UNSPECIFIED_COUNTRY ? (
                          <>
                            <GlobeIcon className="h-4 w-4 text-white/60" />
                            <span>—</span>
                          </>
                        ) : (
                          <>
                            <img
                              src={`https://flagcdn.com/w40/${getCountryCode(player.countryCode).toLowerCase()}.png`}
                              alt={getCountryCode(player.countryCode)}
                              className="h-4 w-6 rounded-sm object-cover"
                              loading="lazy"
                            />
                            <span>{getCountryCode(player.countryCode)}</span>
                          </>
                        )}
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
                    <td className="px-3 py-2">
                      {player.teamTag ?? player.teamName ?? content.freeAgent}
                    </td>
                    <td className="px-3 py-2 font-semibold">{player.points}</td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-white/10 px-3 py-2 text-xs text-white/70">
            <span>
              {content.page} {playersPage}/{totalPlayersPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={playersPage <= 1}
                onClick={() => setPlayersPage((prev) => Math.max(1, prev - 1))}
                className="rounded border border-white/20 px-2 py-1 disabled:opacity-40"
              >
                {content.previousPage}
              </button>
              <button
                type="button"
                disabled={playersPage >= totalPlayersPages}
                onClick={() => setPlayersPage((prev) => Math.min(totalPlayersPages, prev + 1))}
                className="rounded border border-white/20 px-2 py-1 disabled:opacity-40"
              >
                {content.nextPage}
              </button>
            </div>
          </div>
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
                    <td className="px-3 py-2 font-semibold">{country.points.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
