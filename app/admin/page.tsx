"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MatchesTable, { type MatchRecord } from "./components/MatchesTable";
import TeamsPanel from "./components/TeamsPanel";
import { supabase } from "../../lib/supabaseClient";

// ============ LISTE COMPLÈTE DES 195 PAYS ============
const COUNTRIES = [
  { code: "AF", name: "Afghanistan", label: "🇦🇫 Afghanistan" },
  { code: "AL", name: "Albanie", label: "🇦🇱 Albanie" },
  { code: "DZ", name: "Algérie", label: "🇩🇿 Algérie" },
  { code: "AD", name: "Andorre", label: "🇦🇩 Andorre" },
  { code: "AO", name: "Angola", label: "🇦🇴 Angola" },
  { code: "AG", name: "Antigua-et-Barbuda", label: "🇦🇬 Antigua-et-Barbuda" },
  { code: "SA", name: "Arabie Saoudite", label: "🇸🇦 Arabie Saoudite" },
  { code: "AR", name: "Argentine", label: "🇦🇷 Argentine" },
  { code: "AM", name: "Arménie", label: "🇦🇲 Arménie" },
  { code: "AU", name: "Australie", label: "🇦🇺 Australie" },
  { code: "AT", name: "Autriche", label: "🇦🇹 Autriche" },
  { code: "AZ", name: "Azerbaïdjan", label: "🇦🇿 Azerbaïdjan" },
  { code: "BS", name: "Bahamas", label: "🇧🇸 Bahamas" },
  { code: "BH", name: "Bahreïn", label: "🇧🇭 Bahreïn" },
  { code: "BD", name: "Bangladesh", label: "🇧🇩 Bangladesh" },
  { code: "BB", name: "Barbade", label: "🇧🇧 Barbade" },
  { code: "BE", name: "Belgique", label: "🇧🇪 Belgique" },
  { code: "BZ", name: "Belize", label: "🇧🇿 Belize" },
  { code: "BJ", name: "Bénin", label: "🇧🇯 Bénin" },
  { code: "BT", name: "Bhoutan", label: "🇧🇹 Bhoutan" },
  { code: "BY", name: "Biélorussie", label: "🇧🇾 Biélorussie" },
  { code: "MM", name: "Birmanie", label: "🇲🇲 Birmanie" },
  { code: "BO", name: "Bolivie", label: "🇧🇴 Bolivie" },
  { code: "BA", name: "Bosnie-Herzégovine", label: "🇧🇦 Bosnie-Herzégovine" },
  { code: "BW", name: "Botswana", label: "🇧🇼 Botswana" },
  { code: "BR", name: "Brésil", label: "🇧🇷 Brésil" },
  { code: "BN", name: "Brunei", label: "🇧🇳 Brunei" },
  { code: "BG", name: "Bulgarie", label: "🇧🇬 Bulgarie" },
  { code: "BF", name: "Burkina Faso", label: "🇧🇫 Burkina Faso" },
  { code: "BI", name: "Burundi", label: "🇧🇮 Burundi" },
  { code: "KH", name: "Cambodge", label: "🇰🇭 Cambodge" },
  { code: "CM", name: "Cameroun", label: "🇨🇲 Cameroun" },
  { code: "CA", name: "Canada", label: "🇨🇦 Canada" },
  { code: "CV", name: "Cap-Vert", label: "🇨🇻 Cap-Vert" },
  { code: "KZ", name: "Kazakhstan", label: "🇰🇿 Kazakhstan" },
  { code: "QA", name: "Qatar", label: "🇶🇦 Qatar" },
  { code: "KE", name: "Kenya", label: "🇰🇪 Kenya" },
  { code: "KG", name: "Kirghizistan", label: "🇰🇬 Kirghizistan" },
  { code: "KI", name: "Kiribati", label: "🇰🇮 Kiribati" },
  { code: "KW", name: "Koweït", label: "🇰🇼 Koweït" },
  { code: "LA", name: "Laos", label: "🇱🇦 Laos" },
  { code: "LS", name: "Lesotho", label: "🇱🇸 Lesotho" },
  { code: "LV", name: "Lettonie", label: "🇱🇻 Lettonie" },
  { code: "LB", name: "Liban", label: "🇱🇧 Liban" },
  { code: "LR", name: "Liberia", label: "🇱🇷 Liberia" },
  { code: "LY", name: "Libye", label: "🇱🇾 Libye" },
  { code: "LI", name: "Liechtenstein", label: "🇱🇮 Liechtenstein" },
  { code: "LT", name: "Lituanie", label: "🇱🇹 Lituanie" },
  { code: "LU", name: "Luxembourg", label: "🇱🇺 Luxembourg" },
  { code: "MG", name: "Madagascar", label: "🇲🇬 Madagascar" },
  { code: "MY", name: "Malaisie", label: "🇲🇾 Malaisie" },
  { code: "MW", name: "Malawi", label: "🇲🇼 Malawi" },
  { code: "MV", name: "Maldives", label: "🇲🇻 Maldives" },
  { code: "ML", name: "Mali", label: "🇲🇱 Mali" },
  { code: "MT", name: "Malte", label: "🇲🇹 Malte" },
  { code: "MA", name: "Maroc", label: "🇲🇦 Maroc" },
  { code: "MQ", name: "Martinique", label: "🇲🇶 Martinique" },
  { code: "MU", name: "Maurice", label: "🇲🇺 Maurice" },
  { code: "MR", name: "Mauritanie", label: "🇲🇷 Mauritanie" },
  { code: "MX", name: "Mexique", label: "🇲🇽 Mexique" },
  { code: "MD", name: "Moldavie", label: "🇲🇩 Moldavie" },
  { code: "MC", name: "Monaco", label: "🇲🇨 Monaco" },
  { code: "MN", name: "Mongolie", label: "🇲🇳 Mongolie" },
  { code: "ME", name: "Monténégro", label: "🇲🇪 Monténégro" },
  { code: "MZ", name: "Mozambique", label: "🇲🇿 Mozambique" },
  { code: "NA", name: "Namibie", label: "🇳🇦 Namibie" },
  { code: "NR", name: "Nauru", label: "🇳🇷 Nauru" },
  { code: "NP", name: "Népal", label: "🇳🇵 Népal" },
  { code: "NI", name: "Nicaragua", label: "🇳🇮 Nicaragua" },
  { code: "NE", name: "Niger", label: "🇳🇪 Niger" },
  { code: "NG", name: "Nigéria", label: "🇳🇬 Nigéria" },
  { code: "NU", name: "Niue", label: "🇳🇺 Niue" },
  { code: "NO", name: "Norvège", label: "🇳🇴 Norvège" },
  { code: "NZ", name: "Nouvelle-Zélande", label: "🇳🇿 Nouvelle-Zélande" },
  { code: "OM", name: "Oman", label: "🇴🇲 Oman" },
  { code: "UG", name: "Ouganda", label: "🇺🇬 Ouganda" },
  { code: "UZ", name: "Ouzbékistan", label: "🇺🇿 Ouzbékistan" },
  { code: "PK", name: "Pakistan", label: "🇵🇰 Pakistan" },
  { code: "PW", name: "Palaos", label: "🇵🇼 Palaos" },
  { code: "PA", name: "Panama", label: "🇵🇦 Panama" },
  { code: "PG", name: "Papouasie-Nouvelle-Guinée", label: "🇵🇬 Papouasie-Nouvelle-Guinée" },
  { code: "PY", name: "Paraguay", label: "🇵🇾 Paraguay" },
  { code: "NL", name: "Pays-Bas", label: "🇳🇱 Pays-Bas" },
  { code: "PE", name: "Pérou", label: "🇵🇪 Pérou" },
  { code: "PH", name: "Philippines", label: "🇵🇭 Philippines" },
  { code: "PL", name: "Pologne", label: "🇵🇱 Pologne" },
  { code: "PF", name: "Polynésie Française", label: "🇵🇫 Polynésie Française" },
  { code: "PR", name: "Porto Rico", label: "🇵🇷 Porto Rico" },
  { code: "PT", name: "Portugal", label: "🇵🇹 Portugal" },
  { code: "RE", name: "Réunion", label: "🇷🇪 Réunion" },
  { code: "RO", name: "Roumanie", label: "🇷🇴 Roumanie" },
  { code: "GB", name: "Royaume-Uni", label: "🇬🇧 Royaume-Uni" },
  { code: "RU", name: "Russie", label: "🇷🇺 Russie" },
  { code: "RW", name: "Rwanda", label: "🇷🇼 Rwanda" },
  { code: "EH", name: "Sahara Occidental", label: "🇪🇭 Sahara Occidental" },
  { code: "KN", name: "Saint-Christophe-et-Niévès", label: "🇰🇳 Saint-Christophe-et-Niévès" },
  { code: "SM", name: "Saint-Marin", label: "🇸🇲 Saint-Marin" },
  { code: "PM", name: "Saint-Pierre-et-Miquelon", label: "🇵🇲 Saint-Pierre-et-Miquelon" },
  { code: "VC", name: "Saint-Vincent-et-les-Grenadines", label: "🇻🇨 Saint-Vincent-et-les-Grenadines" },
  { code: "SH", name: "Sainte-Hélène", label: "🇸🇭 Sainte-Hélène" },
  { code: "LC", name: "Sainte-Lucie", label: "🇱🇨 Sainte-Lucie" },
  { code: "ST", name: "São Tomé-et-Príncipe", label: "🇸🇹 São Tomé-et-Príncipe" },
  { code: "SN", name: "Sénégal", label: "🇸🇳 Sénégal" },
  { code: "RS", name: "Serbie", label: "🇷🇸 Serbie" },
  { code: "SG", name: "Singapour", label: "🇸🇬 Singapour" },
  { code: "SK", name: "Slovaquie", label: "🇸🇰 Slovaquie" },
  { code: "SI", name: "Slovénie", label: "🇸🇮 Slovénie" },
  { code: "SO", name: "Somalie", label: "🇸🇴 Somalie" },
  { code: "SD", name: "Soudan", label: "🇸🇩 Soudan" },
  { code: "SS", name: "Soudan du Sud", label: "🇸🇸 Soudan du Sud" },
  { code: "SE", name: "Suède", label: "🇸🇪 Suède" },
  { code: "CH", name: "Suisse", label: "🇨🇭 Suisse" },
  { code: "SJ", name: "Svalbard et Jan Mayen", label: "🇸🇯 Svalbard et Jan Mayen" },
  { code: "SZ", name: "Swaziland", label: "🇸🇿 Swaziland" },
  { code: "SY", name: "Syrie", label: "🇸🇾 Syrie" },
  { code: "TJ", name: "Tadjikistan", label: "🇹🇯 Tadjikistan" },
  { code: "TW", name: "Taïwan", label: "🇹🇼 Taïwan" },
  { code: "TZ", name: "Tanzanie", label: "🇹🇿 Tanzanie" },
  { code: "TD", name: "Tchad", label: "🇹🇩 Tchad" },
  { code: "CZ", name: "Tchéquie", label: "🇨🇿 Tchéquie" },
  { code: "TF", name: "Terres Australes Françaises", label: "🇹🇫 Terres Australes Françaises" },
  { code: "TH", name: "Thaïlande", label: "🇹🇭 Thaïlande" },
  { code: "TL", name: "Timor Oriental", label: "🇹🇱 Timor Oriental" },
  { code: "TG", name: "Togo", label: "🇹🇬 Togo" },
  { code: "TK", name: "Tokelau", label: "🇹🇰 Tokelau" },
  { code: "TO", name: "Tonga", label: "🇹🇴 Tonga" },
  { code: "TT", name: "Trinité-et-Tobago", label: "🇹🇹 Trinité-et-Tobago" },
  { code: "TN", name: "Tunisie", label: "🇹🇳 Tunisie" },
  { code: "TM", name: "Turkménistan", label: "🇹🇲 Turkménistan" },
  { code: "TR", name: "Turquie", label: "🇹🇷 Turquie" },
  { code: "TV", name: "Tuvalu", label: "🇹🇻 Tuvalu" },
  { code: "UA", name: "Ukraine", label: "🇺🇦 Ukraine" },
  { code: "UY", name: "Uruguay", label: "🇺🇾 Uruguay" },
  { code: "VU", name: "Vanuatu", label: "🇻🇺 Vanuatu" },
  { code: "VA", name: "Vatican", label: "🇻🇦 Vatican" },
  { code: "VE", name: "Venezuela", label: "🇻🇪 Venezuela" },
  { code: "VN", name: "Viêt Nam", label: "🇻🇳 Viêt Nam" },
  { code: "EJ", name: "Îles Åland", label: "🇪🇯 Îles Åland" },
  { code: "BV", name: "Île Bouvet", label: "🇧🇻 Île Bouvet" },
  { code: "CX", name: "Île Christmas", label: "🇨🇽 Île Christmas" },
  { code: "CC", name: "Îles Cocos", label: "🇨🇨 Îles Cocos" },
  { code: "CK", name: "Îles Cook", label: "🇨🇰 Îles Cook" },
  { code: "FK", name: "Îles Malouines", label: "🇫🇰 Îles Malouines" },
  { code: "FO", name: "Îles Féroé", label: "🇫🇴 Îles Féroé" },
  { code: "GS", name: "Îles Géorgie du Sud et Sandwich du Sud", label: "🇬🇸 Îles Géorgie du Sud et Sandwich du Sud" },
  { code: "HK", name: "Hong Kong", label: "🇭🇰 Hong Kong" },
  { code: "IO", name: "Îles Britanniques de l'Océan Indien", label: "🇮🇴 Îles Britanniques de l'Océan Indien" },
  { code: "MP", name: "Îles Mariannes du Nord", label: "🇲🇵 Îles Mariannes du Nord" },
  { code: "MH", name: "Îles Marshall", label: "🇲🇭 Îles Marshall" },
  { code: "PN", name: "Îles Pitcairn", label: "🇵🇳 Îles Pitcairn" },
  { code: "SB", name: "Îles Salomon", label: "🇸🇧 Îles Salomon" },
  { code: "TC", name: "Îles Turques-et-Caïques", label: "🇹🇨 Îles Turques-et-Caïques" },
  { code: "VI", name: "Îles Vierges des États-Unis", label: "🇻🇮 Îles Vierges des États-Unis" },
  { code: "VG", name: "Îles Vierges Britanniques", label: "🇻🇬 Îles Vierges Britanniques" },
  { code: "UM", name: "Îles mineures éloignées des États-Unis", label: "🇺🇲 Îles mineures éloignées des États-Unis" },
  { code: "BM", name: "Bermudes", label: "🇧🇲 Bermudes" },
  { code: "BQ", name: "Bonaire, Saint-Eustache et Saba", label: "🇧🇶 Bonaire, Saint-Eustache et Saba" },
  { code: "KY", name: "Îles Caïmans", label: "🇰🇾 Îles Caïmans" },
  { code: "CW", name: "Curaçao", label: "🇨🇼 Curaçao" },
  { code: "DJ", name: "Djibouti", label: "🇩🇯 Djibouti" },
  { code: "DM", name: "Dominique", label: "🇩🇲 Dominique" },
  { code: "DO", name: "République Dominicaine", label: "🇩🇴 République Dominicaine" },
  { code: "EG", name: "Égypte", label: "🇪🇬 Égypte" },
  { code: "AE", name: "Émirats Arabes Unis", label: "🇦🇪 Émirats Arabes Unis" },
  { code: "EC", name: "Équateur", label: "🇪🇨 Équateur" },
  { code: "ER", name: "Érythrée", label: "🇪🇷 Érythrée" },
  { code: "ES", name: "Espagne", label: "🇪🇸 Espagne" },
  { code: "EE", name: "Estonie", label: "🇪🇪 Estonie" },
  { code: "FM", name: "États Fédérés de Micronésie", label: "🇫🇲 États Fédérés de Micronésie" },
  { code: "US", name: "États-Unis", label: "🇺🇸 États-Unis" },
  { code: "ET", name: "Éthiopie", label: "🇪🇹 Éthiopie" },
  { code: "FI", name: "Finlande", label: "🇫🇮 Finlande" },
  { code: "FR", name: "France", label: "🇫🇷 France" },
  { code: "GR", name: "Grèce", label: "🇬🇷 Grèce" },
  { code: "GD", name: "Grenade", label: "🇬🇩 Grenade" },
  { code: "GL", name: "Groenland", label: "🇬🇱 Groenland" },
  { code: "GP", name: "Guadeloupe", label: "🇬🇵 Guadeloupe" },
  { code: "GU", name: "Guam", label: "🇬🇺 Guam" },
  { code: "GT", name: "Guatémala", label: "🇬🇹 Guatémala" },
  { code: "GG", name: "Guernesey", label: "🇬🇬 Guernesey" },
  { code: "GN", name: "Guinée", label: "🇬🇳 Guinée" },
  { code: "GQ", name: "Guinée Équatoriale", label: "🇬🇶 Guinée Équatoriale" },
  { code: "GW", name: "Guinée-Bissau", label: "🇬🇼 Guinée-Bissau" },
  { code: "GY", name: "Guyana", label: "🇬🇾 Guyana" },
  { code: "HT", name: "Haïti", label: "🇭🇹 Haïti" },
  { code: "HM", name: "Îles Heard et MacDonald", label: "🇭🇲 Îles Heard et MacDonald" },
  { code: "HN", name: "Honduras", label: "🇭🇳 Honduras" },
  { code: "HU", name: "Hongrie", label: "🇭🇺 Hongrie" },
  { code: "IN", name: "Inde", label: "🇮🇳 Inde" },
  { code: "ID", name: "Indonésie", label: "🇮🇩 Indonésie" },
  { code: "IQ", name: "Irak", label: "🇮🇶 Irak" },
  { code: "IR", name: "Iran", label: "🇮🇷 Iran" },
  { code: "IE", name: "Irlande", label: "🇮🇪 Irlande" },
  { code: "IS", name: "Islande", label: "🇮🇸 Islande" },
  { code: "IL", name: "Israël", label: "🇮🇱 Israël" },
  { code: "IT", name: "Italie", label: "🇮🇹 Italie" },
  { code: "JM", name: "Jamaïque", label: "🇯🇲 Jamaïque" },
  { code: "JP", name: "Japon", label: "🇯🇵 Japon" },
  { code: "JE", name: "Jersey", label: "🇯🇪 Jersey" },
  { code: "JO", name: "Jordanie", label: "🇯🇴 Jordanie" },
];

const tabs = [
  { id: "programme", label: "Programme" },
  { id: "matchs", label: "Matchs" },
  { id: "teams", label: "Teams" },
  { id: "classement", label: "Classement" },
  { id: "joueurs", label: "Joueurs" },
];

type Team = {
  id: string;
  name: string;
  division: string | null;
};

type Season = {
  id: string;
  name?: string | null;
  label?: string | null;
};

type TierPlayer = {
  id: string;
  name: string;
  tier: string;
  points: number;
  countryCode?: string;
  description?: string;
};

const tierOptions = ["Tier S", "Tier A", "Tier B", "Tier C", "Tier D", "Tier E"] as const;

const toFlag = (countryCode?: string) => {
  const normalized = String(countryCode ?? "FR").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "🏳️";
  return String.fromCodePoint(
    ...Array.from(normalized).map((char) => 127397 + char.charCodeAt(0))
  );
};

const getMatchDate = (match: MatchRecord) => match.scheduled_at ?? match.start_time ?? match.played_at;

const formatDate = (value?: string | null) => {
  if (!value) return "";
  return value.replace("T", " ").slice(0, 16);
};

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("programme");
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tierPlayers, setTierPlayers] = useState<TierPlayer[]>([]);
  const [updatingPlayerId, setUpdatingPlayerId] = useState<string | null>(null);
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const fetchAllMatches = async (seasonOverride?: string | null) => {
    let query = supabase
      .from("lfn_matches")
      .select("*")
      .order("day", { ascending: true })
      .order("round", { ascending: true });

    const effectiveSeason = seasonOverride ?? seasonId;
    if (effectiveSeason) {
      query = query.eq("season_id", effectiveSeason);
    }

    const { data, error } = await query;

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setMatches((data ?? []) as MatchRecord[]);
  };

  const fetchTeams = async () => {
    const { data } = await supabase
      .from("lfn_teams")
      .select("id,name,division")
      .order("name", { ascending: true });
    setTeams((data ?? []) as Team[]);
  };

  const fetchSeasons = async () => {
    const { data, error } = await supabase
      .from("lfn_seasons")
      .select("id,name,label,status,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      return;
    }
    const seasonList = (data ?? []) as Array<Season & { status?: string | null }>;
    setSeasons(seasonList);
    const activeSeason = seasonList.find((season) => season.status === "active");
    if (activeSeason?.id) {
      setSeasonId((current) => current ?? activeSeason.id);
      return;
    }
    if (seasonList[0]) {
      setSeasonId((current) => current ?? seasonList[0].id);
    }
  };

  const fetchTierPlayers = async (seasonOverride?: string | null) => {
    try {
      const effectiveSeason = seasonOverride ?? seasonId;
      const query = effectiveSeason ? `?season=${encodeURIComponent(effectiveSeason)}` : "";
      const response = await fetch(`/api/site/player-standings${query}`, { cache: "no-store" });
      const payload = (await response.json()) as { players?: TierPlayer[] };
      setTierPlayers(payload.players ?? []);
    } catch (error) {
      console.error("Unable to load tier players", error);
      setTierPlayers([]);
    }
  };

  const updateTierPlayer = async (payload: {
    playerId: string;
    points: number;
    tier: string;
    countryCode: string;
    description: string;
  }) => {
    const { playerId } = payload;
    setUpdatingPlayerId(playerId);
    try {
      const response = await fetch("/api/admin/player-standings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, seasonId }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setErrorMessage(payload.error ?? "Impossible de mettre à jour le joueur.");
        return;
      }
      await fetchTierPlayers(seasonId);
    } catch (error) {
      console.error("Unable to update tier player", error);
      setErrorMessage("Impossible de mettre à jour le joueur.");
    } finally {
      setUpdatingPlayerId(null);
    }
  };

  const createTierPlayer = async (payload: {
    name: string;
    tier: string;
    points: number;
    countryCode: string;
    description?: string;
  }) => {
    setCreatingPlayer(true);
    try {
      const response = await fetch("/api/admin/player-standings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, seasonId }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setErrorMessage(body.error ?? "Impossible d'ajouter le joueur.");
        return false;
      }
      await fetchTierPlayers(seasonId);
      return true;
    } catch (error) {
      console.error("Unable to create tier player", error);
      setErrorMessage("Impossible d'ajouter le joueur.");
      return false;
    } finally {
      setCreatingPlayer(false);
    }
  };

  const checkAdmin = async () => {
    try {
      const response = await fetch("/api/admin/session", { cache: "no-store" });
      if (!response.ok) {
        router.replace("/admin/login");
        return;
      }
      setLoading(false);
    } catch (error) {
      console.error("Admin session check failed", error);
      router.replace("/admin/login");
    }
  };

  useEffect(() => {
    checkAdmin();
    fetchSeasons();
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchAllMatches(seasonId);
  }, [seasonId]);

  useEffect(() => {
    fetchTierPlayers(seasonId);
  }, [seasonId]);

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      fetchTierPlayers(seasonId);
    }, 10000);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [seasonId]);

  const scheduleDays = useMemo(() => {
    const grouped = new Map<string, MatchRecord[]>();
    matches.forEach((match) => {
      const label = match.day_label ?? `Jour ${match.day ?? ""}`;
      if (!grouped.has(label)) {
        grouped.set(label, []);
      }
      grouped.get(label)?.push(match);
    });
    return Array.from(grouped.entries());
  }, [matches]);

  const standings = useMemo(() => {
    const stats = new Map(
      teams.map((team) => [team.id, { ...team, wins: 0, losses: 0, points: 0, diff: 0 }])
    );

    matches
      .filter((match) => match.status === "completed" || match.status === "finished")
      .forEach((match) => {
        if (!match.team_a_id || !match.team_b_id) {
          return;
        }
        const teamA = stats.get(match.team_a_id);
        const teamB = stats.get(match.team_b_id);
        if (!teamA || !teamB) {
          return;
        }
        const scoreA = match.score_a ?? 0;
        const scoreB = match.score_b ?? 0;
        teamA.diff += scoreA - scoreB;
        teamB.diff += scoreB - scoreA;
        if (scoreA > scoreB) {
          teamA.wins += 1;
          teamB.losses += 1;
        } else if (scoreB > scoreA) {
          teamB.wins += 1;
          teamA.losses += 1;
        }
        teamA.points += scoreA;
        teamB.points += scoreB;
      });

    return Array.from(stats.values()).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.diff - a.diff;
    });
  }, [matches, teams]);

  const filteredTierPlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    if (!query) {
      return tierPlayers;
    }
    return tierPlayers.filter((player) => {
      return (
        player.name.toLowerCase().includes(query) ||
        player.tier.toLowerCase().includes(query) ||
        String(player.countryCode ?? "FR")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [playerSearch, tierPlayers]);

  if (loading) {
    return (
      <div className="dominant-section min-h-[50vh] rounded-[14px] bg-black/60 p-12 text-center text-white/70">
        Chargement...
      </div>
    );
  }

  return (
    <div className="page-stack page-stack--tight">
      <header className="dominant-section rounded-[16px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] signal-accent">LFN ADMIN</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Admin Panel ELITE</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Gestion complète du programme, des matchs et des équipes. UI premium dark.
            </p>
          </div>
          <div className="surface-chip surface-chip--muted">
            Saison active: {seasonId ?? "Aucune"}
          </div>
        </div>
      </header>

      <div className="secondary-section flex flex-wrap gap-2 rounded-[12px] bg-white/5 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`surface-tab ${activeTab === tab.id ? "surface-tab--active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errorMessage ? (
        <div className="surface-alert surface-alert--error">
          {errorMessage}
        </div>
      ) : null}

      {activeTab === "programme" && (
        <section className="secondary-section space-y-6">
          {scheduleDays.map(([day, dayMatches]) => (
            <div key={day} className="surface-card--soft">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{day}</h3>
                <span className="text-xs text-utility">{dayMatches.length} matchs</span>
              </div>
              <div className="mt-4 space-y-3">
                {dayMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm text-white">
                        {match.match_group ?? "Match"} • {match.phase}
                      </p>
                      <p className="text-xs text-utility">
                        {formatDate(getMatchDate(match)) || "Horaire à définir"}
                      </p>
                    </div>
                    <span className="surface-chip surface-chip--muted">
                      {match.division ?? "Division"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === "matchs" && (
        <div className="secondary-section">
          <MatchesTable
            seasonId={seasonId}
            onMatchesUpdated={() => fetchAllMatches(seasonId)}
          />
        </div>
      )}

      {activeTab === "teams" && (
        <div className="secondary-section">
          <TeamsPanel />
        </div>
      )}

      {activeTab === "classement" && (
        <section className="secondary-section surface-card--soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-utility">Classement</p>
              <h3 className="text-lg font-semibold text-white">Classement (client-side)</h3>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="surface-table text-sm text-white/80">
              <thead className="surface-table__header text-xs uppercase text-white/40">
                <tr>
                  <th className="px-3 py-2 text-left">Equipe</th>
                  <th className="px-3 py-2 text-left">W</th>
                  <th className="px-3 py-2 text-left">L</th>
                  <th className="px-3 py-2 text-left">Points</th>
                  <th className="px-3 py-2 text-left">Diff</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team) => (
                  <tr key={team.id} className="surface-table__row">
                    <td className="px-3 py-2 text-white/90">{team.name}</td>
                    <td className="px-3 py-2">{team.wins}</td>
                    <td className="px-3 py-2">{team.losses}</td>
                    <td className="px-3 py-2">{team.points}</td>
                    <td className="px-3 py-2">{team.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "joueurs" && (
        <section className="secondary-section surface-card--soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-utility">Joueurs</p>
              <h3 className="text-lg font-semibold text-white">Classement joueurs (tiers Prissme TV)</h3>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <form
              className="mb-4 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const name = String(formData.get("name") ?? "").trim();
                const tier = String(formData.get("tier") ?? "");
                const points = Number(formData.get("points"));
                const countryCode = String(formData.get("countryCode") ?? "FR").toUpperCase();
                const description = String(formData.get("description") ?? "").trim();

                if (!name) {
                  setErrorMessage("Le pseudo est obligatoire.");
                  return;
                }
                if (!Number.isInteger(points)) {
                  setErrorMessage("Les points doivent être un nombre entier.");
                  return;
                }

                const ok = await createTierPlayer({ name, tier, points, countryCode, description });
                if (ok) {
                  setErrorMessage(null);
                  event.currentTarget.reset();
                }
              }}
            >
              <input
                name="name"
                placeholder="Pseudo du joueur"
                className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
                required
              />
              <select
                name="tier"
                className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
                defaultValue="Tier E"
              >
                {tierOptions.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
              <input
                type="number"
                name="points"
                defaultValue={0}
                className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
                required
              />
              <select
                name="countryCode"
                className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
                defaultValue="FR"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={creatingPlayer}
                className="surface-pill surface-pill--active px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {creatingPlayer ? "Ajout..." : "Ajouter joueur"}
              </button>
              <textarea
                name="description"
                placeholder="Description du joueur (optionnel)"
                className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white md:col-span-5"
                rows={2}
              />
            </form>
            <div className="mb-4">
              <input
                type="search"
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                placeholder="Rechercher un joueur, un tier ou un pays (ex: Tier A, FR...)"
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white placeholder:text-white/40"
              />
            </div>
            <table className="surface-table text-sm text-white/80">
              <thead className="surface-table__header text-xs uppercase text-white/40">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Pseudo</th>
                  <th className="px-3 py-2 text-left">Pays</th>
                  <th className="px-3 py-2 text-left">Tier</th>
                  <th className="px-3 py-2 text-left">Édition</th>
                </tr>
              </thead>
              <tbody>
                {filteredTierPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-white/40">
                      {tierPlayers.length === 0
                        ? "Aucun joueur avec tier actif."
                        : "Aucun joueur ne correspond à la recherche."}
                    </td>
                  </tr>
                ) : (
                  filteredTierPlayers.map((player, index) => {
                    const isExpanded = expandedPlayerId === player.id;
                    return (
                      <Fragment key={player.id}>
                        <tr
                          className="surface-table__row cursor-pointer"
                          onClick={() =>
                            setExpandedPlayerId((current) => (current === player.id ? null : player.id))
                          }
                        >
                          <td className="px-3 py-2">{index + 1}</td>
                          <td className="px-3 py-2">{player.name}</td>
                          <td className="px-3 py-2">
                            {toFlag(player.countryCode)} {player.countryCode ?? "FR"}
                          </td>
                          <td className="px-3 py-2">{player.tier}</td>
                          <td className="px-3 py-2 text-xs text-white/60">
                            {isExpanded ? "Masquer édition" : "Cliquer pour éditer"}
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="surface-table__row bg-white/5">
                            <td colSpan={5} className="px-3 py-3">
                              <form
                                className="flex flex-col gap-2"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  const formData = new FormData(event.currentTarget);
                                  const value = Number(formData.get("points"));
                                  const tier = String(formData.get("tier") ?? "");
                                  const countryCode = String(
                                    formData.get("countryCode") ?? "FR"
                                  ).toUpperCase();
                                  const description = String(formData.get("description") ?? "").trim();
                                  if (!Number.isInteger(value)) {
                                    setErrorMessage("Les points doivent être un nombre entier.");
                                    return;
                                  }
                                  if (!tierOptions.includes(tier as (typeof tierOptions)[number])) {
                                    setErrorMessage("Tier invalide.");
                                    return;
                                  }
                                  updateTierPlayer({
                                    playerId: player.id,
                                    points: value,
                                    tier,
                                    countryCode,
                                    description,
                                  });
                                }}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <select
                                    name="countryCode"
                                    defaultValue={player.countryCode ?? "FR"}
                                    className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-white"
                                  >
                                    {COUNTRIES.map((country) => (
                                      <option key={country.code} value={country.code}>
                                        {country.label}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    name="tier"
                                    defaultValue={player.tier}
                                    className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-white"
                                  >
                                    {tierOptions.map((tier) => (
                                      <option key={tier} value={tier}>
                                        {tier}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    name="points"
                                    defaultValue={player.points}
                                    className="w-24 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-white"
                                  />
                                  <button
                                    type="submit"
                                    disabled={updatingPlayerId === player.id}
                                    className="surface-pill surface-pill--active px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
                                  >
                                    {updatingPlayerId === player.id ? "..." : "Sauver"}
                                  </button>
                                </div>
                                <textarea
                                  name="description"
                                  defaultValue={player.description ?? ""}
                                  rows={3}
                                  placeholder="Description affichée sur /classement et avec !tier"
                                  className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-white"
                                />
                              </form>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
