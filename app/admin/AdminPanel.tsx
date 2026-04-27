"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "../../src/lib/supabase/browser";
import {
  TEAM_COLUMNS,
  TEAM_MEMBER_COLUMNS,
  TEAM_MEMBERS_TABLE,
} from "../../src/lib/supabase/config";
import { withSchema } from "../../src/lib/supabase/schema";
import {
  createMatch as createResultMatch,
  deleteMatch as deleteResultMatch,
  getMatches as getResultMatches,
  updateMatch as updateResultMatch,
  type MatchFilters,
  type ResultMatch,
} from "../../src/lib/lfn-matches";

// ============ LISTE COMPLÈTE DE 200+ PAYS ============
const COUNTRIES = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albanie" },
  { code: "DZ", name: "Algérie" },
  { code: "AD", name: "Andorre" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua-et-Barbuda" },
  { code: "SA", name: "Arabie Saoudite" },
  { code: "AR", name: "Argentine" },
  { code: "AM", name: "Arménie" },
  { code: "AU", name: "Australie" },
  { code: "AT", name: "Autriche" },
  { code: "AZ", name: "Azerbaïdjan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahreïn" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbade" },
  { code: "BE", name: "Belgique" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Bénin" },
  { code: "BT", name: "Bhoutan" },
  { code: "BY", name: "Biélorussie" },
  { code: "MM", name: "Birmanie" },
  { code: "BO", name: "Bolivie" },
  { code: "BA", name: "Bosnie-Herzégovine" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brésil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgarie" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "KH", name: "Cambodge" },
  { code: "CM", name: "Cameroun" },
  { code: "CA", name: "Canada" },
  { code: "CV", name: "Cap-Vert" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "QA", name: "Qatar" },
  { code: "KE", name: "Kenya" },
  { code: "KG", name: "Kirghizistan" },
  { code: "KI", name: "Kiribati" },
  { code: "KW", name: "Koweït" },
  { code: "LA", name: "Laos" },
  { code: "LS", name: "Lesotho" },
  { code: "LV", name: "Lettonie" },
  { code: "LB", name: "Liban" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libye" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lituanie" },
  { code: "LU", name: "Luxembourg" },
  { code: "MG", name: "Madagascar" },
  { code: "MY", name: "Malaisie" },
  { code: "MW", name: "Malawi" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malte" },
  { code: "MA", name: "Maroc" },
  { code: "MQ", name: "Martinique" },
  { code: "MU", name: "Maurice" },
  { code: "MR", name: "Mauritanie" },
  { code: "MX", name: "Mexique" },
  { code: "MD", name: "Moldavie" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolie" },
  { code: "ME", name: "Monténégro" },
  { code: "MZ", name: "Mozambique" },
  { code: "NA", name: "Namibie" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Népal" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigéria" },
  { code: "NU", name: "Niue" },
  { code: "NO", name: "Norvège" },
  { code: "NZ", name: "Nouvelle-Zélande" },
  { code: "OM", name: "Oman" },
  { code: "UG", name: "Ouganda" },
  { code: "UZ", name: "Ouzbékistan" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palaos" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papouasie-Nouvelle-Guinée" },
  { code: "PY", name: "Paraguay" },
  { code: "NL", name: "Pays-Bas" },
  { code: "PE", name: "Pérou" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Pologne" },
  { code: "PF", name: "Polynésie Française" },
  { code: "PR", name: "Porto Rico" },
  { code: "PT", name: "Portugal" },
  { code: "RE", name: "Réunion" },
  { code: "RO", name: "Roumanie" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "RU", name: "Russie" },
  { code: "RW", name: "Rwanda" },
  { code: "EH", name: "Sahara Occidental" },
  { code: "KN", name: "Saint-Christophe-et-Niévès" },
  { code: "SM", name: "Saint-Marin" },
  { code: "PM", name: "Saint-Pierre-et-Miquelon" },
  { code: "VC", name: "Saint-Vincent-et-les-Grenadines" },
  { code: "SH", name: "Sainte-Hélène" },
  { code: "LC", name: "Sainte-Lucie" },
  { code: "BL", name: "Saint-Barthélemy" },
  { code: "MF", name: "Saint-Martin" },
  { code: "ST", name: "São Tomé-et-Príncipe" },
  { code: "SN", name: "Sénégal" },
  { code: "RS", name: "Serbie" },
  { code: "SG", name: "Singapour" },
  { code: "SK", name: "Slovaquie" },
  { code: "SI", name: "Slovénie" },
  { code: "SO", name: "Somalie" },
  { code: "SD", name: "Soudan" },
  { code: "SS", name: "Soudan du Sud" },
  { code: "SE", name: "Suède" },
  { code: "CH", name: "Suisse" },
  { code: "SJ", name: "Svalbard et Jan Mayen" },
  { code: "SZ", name: "Swaziland" },
  { code: "SY", name: "Syrie" },
  { code: "TJ", name: "Tadjikistan" },
  { code: "TW", name: "Taïwan" },
  { code: "TZ", name: "Tanzanie" },
  { code: "TD", name: "Tchad" },
  { code: "CZ", name: "Tchéquie" },
  { code: "TF", name: "Terres Australes Françaises" },
  { code: "TH", name: "Thaïlande" },
  { code: "TL", name: "Timor Oriental" },
  { code: "TG", name: "Togo" },
  { code: "TK", name: "Tokelau" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinité-et-Tobago" },
  { code: "TN", name: "Tunisie" },
  { code: "TM", name: "Turkménistan" },
  { code: "TR", name: "Turquie" },
  { code: "TV", name: "Tuvalu" },
  { code: "UA", name: "Ukraine" },
  { code: "UY", name: "Uruguay" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Viêt Nam" },
  { code: "EJ", name: "Îles Åland" },
  { code: "BV", name: "Île Bouvet" },
  { code: "CX", name: "Île Christmas" },
  { code: "CC", name: "Îles Cocos" },
  { code: "CK", name: "Îles Cook" },
  { code: "FK", name: "Îles Malouines" },
  { code: "FO", name: "Îles Féroé" },
  { code: "GS", name: "Îles Géorgie du Sud et Sandwich du Sud" },
  { code: "HK", name: "Hong Kong" },
  { code: "IO", name: "Îles Britanniques de l'Océan Indien" },
  { code: "MP", name: "Îles Mariannes du Nord" },
  { code: "MH", name: "Îles Marshall" },
  { code: "PN", name: "Îles Pitcairn" },
  { code: "SB", name: "Îles Salomon" },
  { code: "TC", name: "Îles Turques-et-Caïques" },
  { code: "VI", name: "Îles Vierges des États-Unis" },
  { code: "VG", name: "Îles Vierges Britanniques" },
  { code: "UM", name: "Îles mineures éloignées des États-Unis" },
  { code: "BM", name: "Bermudes" },
  { code: "BQ", name: "Bonaire, Saint-Eustache et Saba" },
  { code: "KY", name: "Îles Caïmans" },
  { code: "CW", name: "Curaçao" },
  { code: "SX", name: "Sint-Maarten" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominique" },
  { code: "DO", name: "République Dominicaine" },
  { code: "DE", name: "Allemagne" },
  { code: "EG", name: "Égypte" },
  { code: "AE", name: "Émirats Arabes Unis" },
  { code: "EC", name: "Équateur" },
  { code: "ER", name: "Érythrée" },
  { code: "ES", name: "Espagne" },
  { code: "EE", name: "Estonie" },
  { code: "FM", name: "États Fédérés de Micronésie" },
  { code: "US", name: "États-Unis" },
  { code: "ET", name: "Éthiopie" },
  { code: "FI", name: "Finlande" },
  { code: "FR", name: "France" },
  { code: "GE", name: "Géorgie" },
  { code: "GR", name: "Grèce" },
  { code: "GD", name: "Grenade" },
  { code: "GL", name: "Groenland" },
  { code: "GP", name: "Guadeloupe" },
  { code: "GF", name: "Guyane Française" },
  { code: "GU", name: "Guam" },
  { code: "GT", name: "Guatémala" },
  { code: "GG", name: "Guernesey" },
  { code: "GN", name: "Guinée" },
  { code: "GQ", name: "Guinée Équatoriale" },
  { code: "GW", name: "Guinée-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haïti" },
  { code: "HM", name: "Îles Heard et MacDonald" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hongrie" },
  { code: "IN", name: "Inde" },
  { code: "ID", name: "Indonésie" },
  { code: "IQ", name: "Irak" },
  { code: "IR", name: "Iran" },
  { code: "IE", name: "Irlande" },
  { code: "IS", name: "Islande" },
  { code: "IL", name: "Israël" },
  { code: "IT", name: "Italie" },
  { code: "JM", name: "Jamaïque" },
  { code: "JP", name: "Japon" },
  { code: "JE", name: "Jersey" },
  { code: "JO", name: "Jordanie" },
  { code: "WF", name: "Wallis et Futuna" },
  { code: "NC", name: "Nouvelle-Calédonie" },
  { code: "AS", name: "Samoa Américaines" },
  { code: "WS", name: "Samoa" },
  { code: "SC", name: "Seychelles" },
].sort((a, b) => a.name.localeCompare(b.name));

// ============ Composant de sélection de pays avec recherche ============
type CountrySearchProps = {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
};

function CountrySearch({ value, onChange, placeholder = "Rechercher un pays..." }: CountrySearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return COUNTRIES;
    const query = search.toLowerCase();
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [search]);

  const selected = COUNTRIES.find((c) => c.code === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="surface-input w-full text-left flex items-center justify-between"
      >
        <span>{selected ? selected.name : placeholder}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-10">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-slate-700 text-white text-sm border-b border-white/10 focus:outline-none focus:ring-0"
            autoFocus
          />
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">Aucun pays trouvé</div>
            ) : (
              filtered.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    onChange(country.code);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-400/10 transition-colors ${
                    value === country.code ? "bg-amber-400/20 text-amber-200" : "text-slate-300"
                  }`}
                >
                  <span className="font-medium">{country.code}</span> - {country.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Types ============
type Team = {
  id: string;
  name: string;
  tag: string | null;
  division: string | null;
  logoUrl: string | null;
  statsSummary: string | null;
  mainBrawlers: string | null;
  statsSummaryType: "object" | "string" | null;
  mainBrawlersType: "array" | "string" | null;
  wins: number | null;
  losses: number | null;
  points: number | null;
  roster: TeamRosterMember[];
};

type TeamRosterMember = {
  role: "starter" | "sub" | "coach";
  slot: number | null;
  name: string;
  mains: string | null;
  description: string | null;
  countryCode?: string | null;
  elite?: boolean | null;
  wins?: number | null;
  losses?: number | null;
  points?: number | null;
};

type Match = ResultMatch;

type MatchFormState = {
  day: string;
  division: string;
  startTime: string;
  teamAId: string;
  teamBId: string;
  status: string;
  scoreA: string;
  scoreB: string;
  notes: string;
  vodUrl: string;
  proofUrl: string;
};

type AdminPlayer = {
  id: string;
  name: string;
  countryCode: string;
  tier: string;
  points: number;
  teamId: string | null;
};

// ============ Constantes ============
const emptyTeamForm = {
  name: "",
  tag: "",
  division: "",
  logoUrl: "",
  statsSummary: "",
  mainBrawlers: "",
  roster: [] as TeamRosterMember[],
};

const emptyMatchForm: MatchFormState = {
  day: "1",
  division: "",
  startTime: "",
  teamAId: "",
  teamBId: "",
  status: "scheduled",
  scoreA: "",
  scoreB: "",
  notes: "",
  vodUrl: "",
  proofUrl: "",
};

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Programmé" },
  { value: "live", label: "En cours" },
  { value: "finished", label: "Terminé" },
];

const DIVISION_OPTIONS = [
  { value: "D1", label: "Division 1" },
  { value: "D2", label: "Division 2" },
];

const ROSTER_SLOTS: Array<{ role: TeamRosterMember["role"]; slot: number | null; label: string }> =
  [
    { role: "starter", slot: 1, label: "Joueur 1" },
    { role: "starter", slot: 2, label: "Joueur 2" },
    { role: "starter", slot: 3, label: "Joueur 3" },
    { role: "sub", slot: 1, label: "Sub 1" },
    { role: "sub", slot: 2, label: "Sub 2" },
    { role: "sub", slot: 3, label: "Sub 3" },
    { role: "coach", slot: null, label: "Coach" },
  ];

// ============ Fonctions utilitaires ============
const normalizeDayValue = (day: string | null | undefined) => {
  if (!day) return null;
  const trimmed = day.trim();
  const dayMatch = trimmed.match(/^Day\s*(\d+)$/i);
  if (dayMatch) return dayMatch[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return trimmed;
};

const formatDayLabel = (day: string | null) => {
  if (!day) return "—";
  const normalized = normalizeDayValue(day);
  if (normalized && /^\d+$/.test(normalized)) return `Jour ${normalized}`;
  return day;
};

const buildDayOptions = (count: number) =>
  Array.from({ length: Math.max(count, 1) }, (_, index) => String(index + 1));

const buildRosterTemplate = () =>
  ROSTER_SLOTS.map((slot) => ({
    role: slot.role,
    slot: slot.slot,
    name: "",
    mains: "",
    description: "",
    countryCode: null,
    elite: false,
  }));

const normalizeRoster = (roster?: TeamRosterMember[] | null) => {
  const template = buildRosterTemplate();
  if (!roster || roster.length === 0) return template;
  const normalizedTemplate = template.map((entry) => {
    const existing = roster.find(
      (member) => member.role === entry.role && (member.slot ?? null) === (entry.slot ?? null)
    );
    if (!existing) return entry;
    return {
      ...entry,
      ...existing,
      name: existing.name ?? "",
      mains: existing.mains ?? "",
      description: existing.description ?? "",
      countryCode: existing.countryCode ?? null,
      elite: existing.elite ?? false,
    };
  });
  const extraMembers = roster.filter((member) => {
    const isTemplate = template.some(
      (slot) => slot.role === member.role && (slot.slot ?? null) === (member.slot ?? null)
    );
    return !isTemplate;
  });
  return [...normalizedTemplate, ...extraMembers];
};

const findRosterEntry = (
  roster: TeamRosterMember[],
  role: TeamRosterMember["role"],
  slot: number | null
) =>
  roster.find((member) => member.role === role && (member.slot ?? null) === (slot ?? null)) ?? {
    role,
    slot,
    name: "",
    mains: "",
    description: "",
    countryCode: null,
    elite: false,
  };

const normalizeNullable = (value: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const statusLabel = (status: string) => {
  const option = STATUS_OPTIONS.find((opt) => opt.value === status);
  return option?.label ?? status;
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "scheduled":
      return "bg-blue-400/20 text-blue-200";
    case "live":
      return "bg-green-400/20 text-green-200";
    case "finished":
      return "bg-slate-400/20 text-slate-200";
    default:
      return "bg-slate-400/20 text-slate-200";
  }
};

const formatUpdatedAt = (date: string | null) => {
  if (!date) return "—";
  try {
    const d = new Date(date);
    return d.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
};

// ============ Composant Principal ============
export default function AdminPanel() {
  const supabase = createBrowserClient();

  // États pour les matchs
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchForm, setMatchForm] = useState<MatchFormState>(emptyMatchForm);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [matchDay, setMatchDay] = useState("all");
  const [matchDivision, setMatchDivision] = useState("all");
  const [matchStatus, setMatchStatus] = useState("all");
  
  // ✨ État pour masquer les matchs terminés
  const [hideFinishedMatches, setHideFinishedMatches] = useState(false);

  // États pour les équipes
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"matches" | "teams">("matches");

  // Charger les matchs
  const loadMatches = useCallback(async () => {
    setMatchLoading(true);
    try {
      const results = await getResultMatches({});
      setMatches(results || []);
    } catch (error) {
      console.error("Erreur lors du chargement des matchs:", error);
    } finally {
      setMatchLoading(false);
    }
  }, []);

  // Charger les équipes
  const loadTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const query = supabase
        .from(withSchema(TEAM_COLUMNS.table))
        .select(
          `${TEAM_COLUMNS.id}, ${TEAM_COLUMNS.name}, ${TEAM_COLUMNS.tag}, 
           ${TEAM_COLUMNS.division}, ${TEAM_COLUMNS.logoUrl}, ${TEAM_COLUMNS.statsSummary}, 
           ${TEAM_COLUMNS.mainBrawlers}, ${TEAM_COLUMNS.statsSummaryType}, 
           ${TEAM_COLUMNS.mainBrawlersType}, ${TEAM_COLUMNS.wins}, ${TEAM_COLUMNS.losses}, 
           ${TEAM_COLUMNS.points}`
        );
      const { data, error } = await query;
      if (error) throw error;
      const teamsData = (data || []).map((team: any) => ({
        ...team,
        roster: [],
      }));
      setTeams(teamsData);
    } catch (error) {
      console.error("Erreur lors du chargement des équipes:", error);
    } finally {
      setTeamsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadTeams();
    loadMatches();
  }, [loadTeams, loadMatches]);

  // Options pour les sélects
  const dayOptions = useMemo(() => {
    const daysInMatches = new Set<string>();
    matches.forEach((match) => {
      const day = normalizeDayValue(match.day);
      if (day) daysInMatches.add(day);
    });
    return Array.from(daysInMatches).sort((a, b) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    });
  }, [matches]);

  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: team.id, label: team.name })),
    [teams]
  );

  // 🔍 Filtrer les matchs
  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      // Filtre par journée
      if (matchDay !== "all" && normalizeDayValue(match.day) !== matchDay) {
        return false;
      }
      // Filtre par division
      if (matchDivision !== "all" && match.division !== matchDivision) {
        return false;
      }
      // Filtre par statut
      if (matchStatus !== "all" && match.status !== matchStatus) {
        return false;
      }
      // ✨ Filtre pour masquer les matchs terminés
      if (hideFinishedMatches && match.status === "finished") {
        return false;
      }
      return true;
    });
  }, [matches, matchDay, matchDivision, matchStatus, hideFinishedMatches]);

  // Gérer l'ajout/modification de match
  const handleSubmitMatch = async () => {
    if (!matchForm.teamAId || !matchForm.teamBId) {
      alert("Veuillez sélectionner les deux équipes");
      return;
    }
    try {
      if (editingMatchId) {
        await updateResultMatch(editingMatchId, {
          day: matchForm.day,
          division: matchForm.division,
          startTime: matchForm.startTime,
          teamAId: matchForm.teamAId,
          teamBId: matchForm.teamBId,
          status: matchForm.status,
          scoreA: matchForm.status === "finished" ? parseInt(matchForm.scoreA) || 0 : null,
          scoreB: matchForm.status === "finished" ? parseInt(matchForm.scoreB) || 0 : null,
          notes: normalizeNullable(matchForm.notes),
          vodUrl: normalizeNullable(matchForm.vodUrl),
          proofUrl: normalizeNullable(matchForm.proofUrl),
        });
      } else {
        await createResultMatch({
          day: matchForm.day,
          division: matchForm.division,
          startTime: matchForm.startTime,
          teamAId: matchForm.teamAId,
          teamBId: matchForm.teamBId,
          status: matchForm.status,
          scoreA: matchForm.status === "finished" ? parseInt(matchForm.scoreA) || 0 : null,
          scoreB: matchForm.status === "finished" ? parseInt(matchForm.scoreB) || 0 : null,
          notes: normalizeNullable(matchForm.notes),
          vodUrl: normalizeNullable(matchForm.vodUrl),
          proofUrl: normalizeNullable(matchForm.proofUrl),
        });
      }
      loadMatches();
      resetMatchForm();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du match:", error);
    }
  };

  // Éditer un match
  const handleEditMatch = (match: Match) => {
    setEditingMatchId(match.id);
    setMatchForm({
      day: match.day || "1",
      division: match.division || "",
      startTime: match.startTime || "",
      teamAId: match.teamAId || "",
      teamBId: match.teamBId || "",
      status: match.status || "scheduled",
      scoreA: match.scoreA?.toString() || "",
      scoreB: match.scoreB?.toString() || "",
      notes: match.notes || "",
      vodUrl: match.vodUrl || "",
      proofUrl: match.proofUrl || "",
    });
  };

  // Supprimer un match
  const deleteMatch = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce match ?")) return;
    setDeletingId(id);
    try {
      await deleteResultMatch(id);
      loadMatches();
    } catch (error) {
      console.error("Erreur lors de la suppression du match:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Réinitialiser le formulaire
  const resetMatchForm = () => {
    setMatchForm(emptyMatchForm);
    setEditingMatchId(null);
  };

  // ============ RENDER ============
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <h1 className="text-3xl font-bold text-white">Panneau d'administration</h1>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab("matches")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "matches"
              ? "border-b-2 border-amber-400 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Matchs
        </button>
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "teams"
              ? "border-b-2 border-amber-400 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Équipes
        </button>
      </div>

      {/* ============ TAB MATCHS ============ */}
      {activeTab === "matches" && (
        <section className="space-y-6">
          {/* Formulaire d'ajout de match */}
          <div className="section-card space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {editingMatchId ? "Modifier le match" : "Ajouter un match"}
            </h2>

            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={matchForm.day}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, day: event.target.value }))}
                className="surface-input"
              >
                {buildDayOptions(7).map((day) => (
                  <option key={day} value={day}>
                    {formatDayLabel(day)}
                  </option>
                ))}
              </select>
              <select
                value={matchForm.division}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, division: event.target.value }))
                }
                className="surface-input"
              >
                <option value="">Division</option>
                {DIVISION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={matchForm.startTime}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, startTime: event.target.value }))
                }
                placeholder="Heure"
                className="surface-input"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={matchForm.teamAId}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, teamAId: event.target.value }))
                }
                className="surface-input"
              >
                <option value="">Équipe A</option>
                {teamOptions.map((team) => (
                  <option key={team.value} value={team.value}>
                    {team.label}
                  </option>
                ))}
              </select>
              <select
                value={matchForm.teamBId}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, teamBId: event.target.value }))
                }
                className="surface-input"
              >
                <option value="">Équipe B</option>
                {teamOptions.map((team) => (
                  <option key={team.value} value={team.value}>
                    {team.label}
                  </option>
                ))}
              </select>
              <select
                value={matchForm.status}
                onChange={(event) =>
                  setMatchForm((prev) => {
                    const nextStatus = event.target.value;
                    return {
                      ...prev,
                      status: nextStatus,
                      scoreA: nextStatus === "finished" ? prev.scoreA : "",
                      scoreB: nextStatus === "finished" ? prev.scoreB : "",
                    };
                  })
                }
                className="surface-input"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="number"
                min={0}
                value={matchForm.scoreA}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, scoreA: event.target.value }))
                }
                placeholder="Score A"
                disabled={matchForm.status !== "finished"}
                className="surface-input disabled:opacity-50"
              />
              <input
                type="number"
                min={0}
                value={matchForm.scoreB}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, scoreB: event.target.value }))
                }
                placeholder="Score B"
                disabled={matchForm.status !== "finished"}
                className="surface-input disabled:opacity-50"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <textarea
                value={matchForm.notes}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Notes"
                className="surface-textarea"
              />
              <input
                value={matchForm.vodUrl}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, vodUrl: event.target.value }))
                }
                placeholder="Lien VOD"
                className="surface-input"
              />
              <input
                value={matchForm.proofUrl}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, proofUrl: event.target.value }))
                }
                placeholder="Lien preuve"
                className="surface-input"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSubmitMatch}
                className="inline-flex items-center justify-center rounded-full bg-amber-400/90 px-5 py-2 text-sm font-semibold text-slate-900"
              >
                {editingMatchId ? "Enregistrer" : "Ajouter le match"}
              </button>
              {editingMatchId ? (
                <button
                  type="button"
                  onClick={resetMatchForm}
                  className="surface-pill px-5 py-2 text-sm text-slate-200"
                >
                  Annuler
                </button>
              ) : null}
            </div>
          </div>

          {/* Tableau des matchs */}
          <div className="section-card space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Résultats enregistrés</h2>
                <p className="text-xs text-slate-400">
                  Filtrez par journée, division ou statut.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={matchDay}
                  onChange={(event) => setMatchDay(event.target.value)}
                  className="surface-pill px-4 py-2 text-xs text-white"
                >
                  <option value="all">Toutes journées</option>
                  {dayOptions.map((day) => (
                    <option key={day} value={day}>
                      {formatDayLabel(day)}
                    </option>
                  ))}
                </select>
                <select
                  value={matchDivision}
                  onChange={(event) => setMatchDivision(event.target.value)}
                  className="surface-pill px-4 py-2 text-xs text-white"
                >
                  <option value="all">Toutes divisions</option>
                  {DIVISION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={matchStatus}
                  onChange={(event) => setMatchStatus(event.target.value)}
                  className="surface-pill px-4 py-2 text-xs text-white"
                >
                  <option value="all">Tous statuts</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {/* ✨ Bouton pour masquer les matchs terminés */}
                <button
                  onClick={() => setHideFinishedMatches(!hideFinishedMatches)}
                  className={`surface-pill px-4 py-2 text-xs font-medium transition-colors ${
                    hideFinishedMatches
                      ? "bg-amber-400/20 text-amber-200"
                      : "text-slate-200"
                  }`}
                >
                  {hideFinishedMatches ? "✓ Masquer terminés" : "Afficher tous"}
                </button>

                <button
                  type="button"
                  onClick={resetMatchForm}
                  className="surface-pill px-4 py-2 text-xs text-slate-200"
                >
                  Ajouter un match
                </button>
              </div>
            </div>

            {matchLoading ? (
              <p className="text-sm text-slate-400">Chargement des matchs...</p>
            ) : filteredMatches.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun match ne correspond aux filtres.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Jour</th>
                      <th className="px-3 py-2">Division</th>
                      <th className="px-3 py-2">Heure</th>
                      <th className="px-3 py-2">Équipe A</th>
                      <th className="px-3 py-2">Équipe B</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Score</th>
                      <th className="px-3 py-2">Mis à jour</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMatches.map((match) => {
                      const teamA = teams.find((team) => team.id === match.teamAId);
                      const teamB = teams.find((team) => team.id === match.teamBId);
                      const scoreLabel =
                        match.status === "finished"
                          ? `${match.scoreA ?? "-"} - ${match.scoreB ?? "-"}`
                          : "—";
                      return (
                        <tr key={match.id}>
                          <td className="px-3 py-2 text-slate-200">
                            {formatDayLabel(match.day ?? null)}
                          </td>
                          <td className="px-3 py-2">{match.division ?? "—"}</td>
                          <td className="px-3 py-2">{match.startTime || "—"}</td>
                          <td className="px-3 py-2">{teamA?.name ?? match.teamAId}</td>
                          <td className="px-3 py-2">{teamB?.name ?? match.teamBId}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-medium ${statusBadgeClass(
                                match.status
                              )}`}
                            >
                              {statusLabel(match.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2">{scoreLabel}</td>
                          <td className="px-3 py-2">{formatUpdatedAt(match.updatedAt)}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditMatch(match)}
                                className="surface-chip surface-chip--muted"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteMatch(match.id)}
                                disabled={deletingId === match.id}
                                className="surface-chip text-rose-200"
                              >
                                {deletingId === match.id ? "Suppression..." : "Supprimer"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============ TAB ÉQUIPES ============ */}
      {activeTab === "teams" && (
        <section className="space-y-6">
          <div className="section-card">
            {teamsLoading ? (
              <p className="text-sm text-slate-400">Chargement des équipes...</p>
            ) : teams.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune équipe enregistrée.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                  <div key={team.id} className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
                    <h3 className="font-semibold text-white">{team.name}</h3>
                    <p className="text-xs text-slate-400">{team.tag || "—"}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Division: <span className="font-medium">{team.division || "—"}</span>
                    </p>
                    <p className="text-sm text-slate-300">
                      V/D: <span className="font-medium">{team.wins || 0}/{team.losses || 0}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
