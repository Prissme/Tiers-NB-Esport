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

type SummaryCard = {
  label: string;
  value: string;
  helper?: string;
};

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
  day: "Day 2",
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

const DAY_OPTIONS = ["Day 1", "Day 2", "Day 3"];

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

const buildRosterTemplate = () =>
  ROSTER_SLOTS.map((slot) => ({
    role: slot.role,
    slot: slot.slot,
    name: "",
    mains: "",
    description: "",
  }));

const normalizeRoster = (roster?: TeamRosterMember[] | null) => {
  const template = buildRosterTemplate();
  if (!roster || roster.length === 0) {
    return template;
  }
  const normalizedTemplate = template.map((entry) => {
    const existing = roster.find(
      (member) => member.role === entry.role && (member.slot ?? null) === (entry.slot ?? null)
    );
    if (!existing) {
      return entry;
    }
    return {
      ...entry,
      ...existing,
      name: existing.name ?? "",
      mains: existing.mains ?? "",
      description: existing.description ?? "",
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
  };

const normalizeNullable = (value: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeMainBrawlers = (value: unknown): string[] | null => {
  if (value == null) {
    return null;
  }
  if (Array.isArray(value)) {
    const normalized = value.map((entry) => String(entry).trim()).filter(Boolean);
    return normalized.length ? normalized : null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  const normalized = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return normalized.length ? normalized : null;
};

const normalizeStatsSummary = (value: unknown) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }
  return {};
};

const normalizeDivision = (input: unknown): string => {
  const raw = String(input ?? "").trim();
  if (!raw) {
    return "";
  }
  const v = raw.toLowerCase();
  if (["d1", "division 1", "division1", "1", "division_1"].includes(v)) {
    return "D1";
  }
  if (["d2", "division 2", "division2", "2", "division_2"].includes(v)) {
    return "D2";
  }
  console.warn("Unknown division value", { input });
  return raw;
};

const toDivisionOption = (division?: string | null) => {
  const normalized = normalizeDivision(division ?? "");
  if (normalized === "D1") {
    return "D1";
  }
  if (normalized === "D2") {
    return "D2";
  }
  return division ?? "";
};

const normalizeStatsSummaryPayload = (value: unknown) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // fall through to return string
    }
    return trimmed;
  }
  return null;
};

const formatUpdatedAt = (value: string | null) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusBadgeClass = (status?: string | null) => {
  switch (status) {
    case "live":
      return "bg-amber-400/20 text-amber-200";
    case "finished":
      return "bg-slate-500/20 text-slate-200";
    case "scheduled":
      return "bg-sky-400/20 text-sky-200";
    default:
      return "bg-sky-400/20 text-sky-200";
  }
};

const statusLabel = (status?: string | null) => {
  switch (status) {
    case "live":
      return "En cours";
    case "finished":
      return "Terminé";
    case "scheduled":
      return "Programmé";
    default:
      return "Programmé";
  }
};

const sanitizeInput = (value: string) => value.replace(/\s+/g, " ").trimStart();

export default function AdminPanel() {
  const supabase = useMemo(() => {
    const client = createBrowserClient();
    return client ? withSchema(client) : null;
  }, []);
  const [activeTab, setActiveTab] = useState<"teams" | "results">("teams");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsSnapshot, setTeamsSnapshot] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamForm, setTeamForm] = useState({
    ...emptyTeamForm,
    roster: buildRosterTemplate(),
  });
  const [matchForm, setMatchForm] = useState(emptyMatchForm);
  const [teamFormErrors, setTeamFormErrors] = useState<string[]>([]);
  const [matchFormErrors, setMatchFormErrors] = useState<string[]>([]);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamDivision, setTeamDivision] = useState("all");
  const [teamSortKey, setTeamSortKey] = useState<"name" | "wins" | "points">("name");
  const [teamSortDir, setTeamSortDir] = useState<"asc" | "desc">("asc");
  const [openTeamIds, setOpenTeamIds] = useState<string[]>([]);
  const [multiOpenTeams, setMultiOpenTeams] = useState(false);
  const [matchDay, setMatchDay] = useState("all");
  const [matchDivision, setMatchDivision] = useState("all");
  const [matchStatus, setMatchStatus] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToastMessage({ type, message });
  }, []);
  const playoffsDeadline = useMemo(() => new Date(Date.UTC(2026, 0, 17, 18, 0, 0)), []);
  const playoffsDeadlineLabel = useMemo(
    () =>
      playoffsDeadline.toLocaleString("fr-BE", {
        timeZone: "Europe/Brussels",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [playoffsDeadline]
  );
  const [playoffsCountdown, setPlayoffsCountdown] = useState({
    label: "Calcul en cours...",
    ended: false,
  });

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
        <div className="max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-xl">
          <h1 className="text-2xl font-semibold">Supabase non configuré</h1>
          <p className="mt-4 text-sm text-slate-300">
            Les clés publiques Supabase sont absentes. Ajoutez NEXT_PUBLIC_SUPABASE_URL et
            NEXT_PUBLIC_SUPABASE_ANON_KEY (ou SUPABASE_URL/SUPABASE_ANON_KEY) pour activer l’admin.
          </p>
        </div>
      </div>
    );
  }

  const toTextValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const toNumber = (value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const mapTeamRow = (row: Record<string, unknown>) => {
    const rawStatsSummary = row[TEAM_COLUMNS.statsSummary];
    const rawMainBrawlers = row[TEAM_COLUMNS.mainBrawlers];
    const statsSummaryType =
      rawStatsSummary && typeof rawStatsSummary === "object" && !Array.isArray(rawStatsSummary)
        ? "object"
        : rawStatsSummary == null
          ? null
          : "string";
    const mainBrawlersType = Array.isArray(rawMainBrawlers)
      ? "array"
      : rawMainBrawlers == null
        ? null
        : "string";

    return {
      id: String(row[TEAM_COLUMNS.id] ?? ""),
      name: String(row[TEAM_COLUMNS.name] ?? ""),
      tag: row[TEAM_COLUMNS.tag] ? String(row[TEAM_COLUMNS.tag]) : null,
      division: row[TEAM_COLUMNS.division] ? String(row[TEAM_COLUMNS.division]) : null,
      logoUrl: row[TEAM_COLUMNS.logoUrl] ? String(row[TEAM_COLUMNS.logoUrl]) : null,
      statsSummary: toTextValue(rawStatsSummary),
      mainBrawlers: toTextValue(rawMainBrawlers),
      statsSummaryType,
      mainBrawlersType,
      wins: toNumber(row[TEAM_COLUMNS.wins]),
      losses: toNumber(row[TEAM_COLUMNS.losses]),
      points: toNumber(row[TEAM_COLUMNS.points]),
    };
  };

  const mapMemberRow = (row: Record<string, unknown>) => ({
    teamId: String(row[TEAM_MEMBER_COLUMNS.teamId] ?? ""),
    role: String(row[TEAM_MEMBER_COLUMNS.role] ?? ""),
    slot: toNumber(row[TEAM_MEMBER_COLUMNS.slot]),
    name: String(row[TEAM_MEMBER_COLUMNS.name] ?? ""),
    mains: toTextValue(row[TEAM_MEMBER_COLUMNS.mains]),
    description: row[TEAM_MEMBER_COLUMNS.description]
      ? String(row[TEAM_MEMBER_COLUMNS.description])
      : null,
  });

  const teamOptions = useMemo(
    () => teams.map((team) => ({ label: `${team.name} (${team.tag ?? "?"})`, value: team.id })),
    [teams]
  );

  const loadTeams = useCallback(async () => {
    const [{ data, error }, membersResponse] = await Promise.all([
      supabase.from("lfn_teams").select("*").order("created_at", { ascending: false }),
      supabase.from(TEAM_MEMBERS_TABLE).select("*"),
    ]);

    if (error || membersResponse.error) {
      throw new Error(error?.message || membersResponse.error?.message);
    }

    const membersByTeam = new Map<string, ReturnType<typeof mapMemberRow>[]>();
    (membersResponse.data ?? []).forEach((row) => {
      const mapped = mapMemberRow(row as Record<string, unknown>);
      if (!membersByTeam.has(mapped.teamId)) {
        membersByTeam.set(mapped.teamId, []);
      }
      membersByTeam.get(mapped.teamId)?.push(mapped);
    });

    const teamsList = Array.isArray(data) ? data : [];
    const normalizedTeams = teamsList.map((row) => {
      const mapped = mapTeamRow(row as Record<string, unknown>);
      const resolved = mapped;
      const roster = (membersByTeam.get(mapped.id) ?? []).map((member) => ({
        ...member,
        wins: resolved.wins,
        losses: resolved.losses,
        points: resolved.points,
      }));
      return {
        ...resolved,
        roster: normalizeRoster(roster as TeamRosterMember[]),
      };
    });

    setTeams(normalizedTeams);
    setTeamsSnapshot(normalizedTeams);
    setOpenTeamIds((prev) =>
      prev.length > 0 ? prev : normalizedTeams[0] ? [normalizedTeams[0].id] : []
    );

    return normalizedTeams;
  }, [supabase]);

  const loadMatches = useCallback(
    async (filters?: MatchFilters) => {
      setMatchLoading(true);
      try {
        const data = await getResultMatches(filters);
        setMatches(data);
      } catch (error) {
        console.error("loadMatches error", error);
        showToast(
          "error",
          error instanceof Error ? error.message : "Erreur lors du chargement des matchs."
        );
      } finally {
        setMatchLoading(false);
      }
    },
    [showToast]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const teamsList = await loadTeams();

      if (teamsList.length === 0) {
        setMatches([]);
        return;
      }

      await loadMatches();
    } catch (error) {
      console.error("Admin load data error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.");
      setTeams([]);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [loadMatches, loadTeams]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setOpenTeamIds((prev) => prev.filter((id) => teams.some((team) => team.id === id)));
  }, [teams]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeout = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const computePlayoffsCountdown = useCallback(() => {
    const now = new Date();
    const diffMs = playoffsDeadline.getTime() - now.getTime();
    if (diffMs <= 0) {
      return { label: "Play-offs terminés", ended: true };
    }
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const label = `${days}j ${hours}h ${minutes}m ${seconds}s`;
    return { label, ended: false };
  }, [playoffsDeadline]);

  useEffect(() => {
    const updateCountdown = () => {
      setPlayoffsCountdown(computePlayoffsCountdown());
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [computePlayoffsCountdown]);

  const teamSummary = useMemo(() => {
    const totalTeams = teams.length;
    const divisions = new Map<string, number>();
    let missingLogos = 0;
    let missingTags = 0;
    teams.forEach((team) => {
      const division = team.division || "Sans division";
      divisions.set(division, (divisions.get(division) ?? 0) + 1);
      if (!team.logoUrl) {
        missingLogos += 1;
      }
      if (!team.tag) {
        missingTags += 1;
      }
    });
    const divisionSummary = [...divisions.entries()]
      .map(([division, count]) => `${division}: ${count}`)
      .join(" · ");
    const cards: SummaryCard[] = [
      { label: "Équipes", value: String(totalTeams), helper: divisionSummary || "Aucune division" },
      { label: "Logos manquants", value: String(missingLogos), helper: "À compléter pour un rendu pro" },
      { label: "Tags manquants", value: String(missingTags), helper: "À compléter pour l'affichage" },
    ];
    return cards;
  }, [teams]);

  const matchSummary = useMemo(() => {
    const liveCount = matches.filter((match) => match.status === "live").length;
    const finishedCount = matches.filter((match) => match.status === "finished").length;
    const totalCount = matches.length;
    const cards: SummaryCard[] = [
      { label: "Live", value: String(liveCount), helper: "Matchs en cours" },
      { label: "Terminés", value: String(finishedCount), helper: "Scores validés" },
      { label: "Total", value: String(totalCount), helper: "Matchs enregistrés" },
    ];
    return cards;
  }, [matches]);

  const filteredTeams = useMemo(() => {
    const searchLower = teamSearch.trim().toLowerCase();
    const filtered = teams.filter((team) => {
      const matchesSearch =
        !searchLower ||
        team.name.toLowerCase().includes(searchLower) ||
        (team.tag ?? "").toLowerCase().includes(searchLower);
      const matchesDivision =
        teamDivision === "all" ||
        normalizeDivision(team.division ?? "") === normalizeDivision(teamDivision);
      return matchesSearch && matchesDivision;
    });
    const sorted = [...filtered].sort((teamA, teamB) => {
      const dir = teamSortDir === "asc" ? 1 : -1;
      if (teamSortKey === "name") {
        return dir * teamA.name.localeCompare(teamB.name);
      }
      if (teamSortKey === "wins") {
        return dir * ((teamA.wins ?? 0) - (teamB.wins ?? 0));
      }
      return dir * ((teamA.points ?? 0) - (teamB.points ?? 0));
    });
    return sorted;
  }, [teamDivision, teamSearch, teamSortDir, teamSortKey, teams]);

  const getTeamRosterStats = (team: Team) => {
    const activeMembers = team.roster.filter((member) => (member.name ?? "").trim().length > 0);
    const activeStarters = activeMembers.filter(
      (member) => member.role === "starter" && [1, 2, 3].includes(member.slot ?? -1)
    );
    return {
      membersCount: activeMembers.length,
      startersCount: activeStarters.length,
      rosterIncomplete: activeStarters.length < 3,
    };
  };

  const getBrawlerChips = (value: string | null) => normalizeMainBrawlers(value) ?? [];

  const toggleTeamOpen = (id: string) => {
    setOpenTeamIds((prev) => {
      const isOpen = prev.includes(id);
      if (multiOpenTeams) {
        return isOpen ? prev.filter((teamId) => teamId !== id) : [...prev, id];
      }
      return isOpen ? [] : [id];
    });
  };

  const expandAllTeams = () => {
    setMultiOpenTeams(true);
    setOpenTeamIds(filteredTeams.map((team) => team.id));
  };

  const collapseAllTeams = () => {
    setOpenTeamIds([]);
  };

  const handleMultiOpenToggle = (enabled: boolean) => {
    setMultiOpenTeams(enabled);
    if (!enabled) {
      setOpenTeamIds((prev) => (prev.length > 0 ? [prev[0]] : []));
    }
  };

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const matchesDay = matchDay === "all" || (match.day ?? "") === matchDay;
      const matchesDivision = matchDivision === "all" || (match.division ?? "") === matchDivision;
      const matchesStatus = matchStatus === "all" || match.status === matchStatus;
      return matchesDay && matchesDivision && matchesStatus;
    });
  }, [matchDay, matchDivision, matchStatus, matches]);

  type TeamEditableField =
    | "name"
    | "tag"
    | "division"
    | "logoUrl"
    | "statsSummary"
    | "mainBrawlers";

  const handleTeamField = (id: string, field: TeamEditableField, value: string) => {
    setTeams((prev) =>
      prev.map((team) => (team.id === id ? { ...team, [field]: value } : team))
    );
  };

  const isDuplicateTag = (tagValue: string | null, teamId?: string) => {
    const normalized = (tagValue ?? "").trim().toUpperCase();
    if (!normalized) {
      return false;
    }
    return teams.some(
      (team) => team.id !== teamId && (team.tag ?? "").trim().toUpperCase() === normalized
    );
  };

  const updateRosterEntry = (
    roster: TeamRosterMember[],
    role: TeamRosterMember["role"],
    slot: number | null,
    field: "name" | "mains" | "description",
    value: string
  ) => {
    let updated = false;
    const nextRoster = roster.map((member) => {
      if (member.role === role && (member.slot ?? null) === (slot ?? null)) {
        updated = true;
        return { ...member, [field]: value };
      }
      return member;
    });

    if (!updated) {
      nextRoster.push({
        role,
        slot,
        name: field === "name" ? value : "",
        mains: field === "mains" ? value : "",
        description: field === "description" ? value : "",
      });
    }

    return normalizeRoster(nextRoster);
  };

  const addRosterMember = (teamId: string) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id !== teamId) {
          return team;
        }
        const usedSlots = team.roster
          .filter((member) => member.slot != null)
          .map((member) => member.slot ?? 0);
        const nextStarterSlot = [1, 2, 3].find((slot) => !usedSlots.includes(slot));
        const maxSlot = usedSlots.length ? Math.max(...usedSlots) : 3;
        const nextExtraSlot = Math.max(3, maxSlot) + 1;
        const nextMember: TeamRosterMember = {
          role: nextStarterSlot ? "starter" : "sub",
          slot: nextStarterSlot ?? nextExtraSlot,
          name: "",
          mains: "",
          description: "",
        };
        return {
          ...team,
          roster: normalizeRoster([...team.roster, nextMember]),
        };
      })
    );
  };

  const clearRosterEntry = (teamId: string, role: TeamRosterMember["role"], slot: number | null) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id !== teamId) {
          return team;
        }
        const nextRoster = team.roster.map((member) =>
          member.role === role && (member.slot ?? null) === (slot ?? null)
            ? { ...member, name: "", mains: "", description: "" }
            : member
        );
        return { ...team, roster: normalizeRoster(nextRoster) };
      })
    );
  };

  const removeRosterEntry = (
    teamId: string,
    role: TeamRosterMember["role"],
    slot: number | null
  ) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id !== teamId) {
          return team;
        }
        const nextRoster = team.roster.filter(
          (member) => !(member.role === role && (member.slot ?? null) === (slot ?? null))
        );
        return { ...team, roster: normalizeRoster(nextRoster) };
      })
    );
  };

  const buildRosterPayload = (roster: TeamRosterMember[]) =>
    roster
      .map((member) => ({
        role: member.role,
        slot: member.slot ?? null,
        name: sanitizeInput(member.name ?? ""),
        mains: member.mains ? member.mains.trim() : "",
        description: member.description ? member.description.trim() : "",
      }))
      .filter((member) => member.name.length > 0)
      .map((member) => ({
        role: member.role,
        slot: member.slot ?? null,
        name: member.name,
        mains: normalizeNullable(member.mains),
        description: normalizeNullable(member.description),
      }));

  const handleTeamRosterField = (
    id: string,
    role: TeamRosterMember["role"],
    slot: number | null,
    field: "name" | "mains" | "description",
    value: string
  ) => {
    setTeams((prev) =>
      prev.map((team) =>
        team.id === id
          ? {
              ...team,
              roster: updateRosterEntry(team.roster, role, slot, field, value),
            }
          : team
      )
    );
  };

  const handleSaveTeam = async (team: Team) => {
    setStatusMessage(null);
    setErrorMessage(null);

    if (isDuplicateTag(team.tag, team.id)) {
      const message = "Tag déjà utilisé.";
      setErrorMessage(message);
      showToast("error", message);
      return;
    }

    const normalizedDivision = normalizeDivision(team.division);
    const normalizedMainBrawlers = normalizeMainBrawlers(team.mainBrawlers);
    const mainBrawlersPayload =
      team.mainBrawlersType === "string"
        ? normalizedMainBrawlers?.join(", ") ?? null
        : normalizedMainBrawlers;
    const statsSummaryPayload =
      team.statsSummaryType === "string"
        ? team.statsSummary?.trim() || null
        : normalizeStatsSummaryPayload(team.statsSummary);

    const payload = {
      name: team.name?.trim() || null,
      tag: team.tag?.trim().toUpperCase() || null,
      division: normalizedDivision || null,
      logo_url: team.logoUrl?.trim() || null,
      stats_summary: statsSummaryPayload ?? null,
      main_brawlers: mainBrawlersPayload ?? null,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    try {
      const rosterPayload = buildRosterPayload(team.roster);
      const { error: deleteError } = await supabase
        .from(TEAM_MEMBERS_TABLE)
        .delete()
        .eq(TEAM_MEMBER_COLUMNS.teamId, team.id);

      if (deleteError) {
        console.error("Admin team roster delete error:", deleteError);
        throw deleteError;
      }

      if (rosterPayload.length > 0) {
        const rosterInsertPayload = rosterPayload.map((member) => ({
          [TEAM_MEMBER_COLUMNS.teamId]: team.id,
          [TEAM_MEMBER_COLUMNS.role]: member.role,
          [TEAM_MEMBER_COLUMNS.slot]: member.slot ?? null,
          [TEAM_MEMBER_COLUMNS.name]: member.name,
          [TEAM_MEMBER_COLUMNS.mains]: member.mains ?? null,
          [TEAM_MEMBER_COLUMNS.description]: member.description ?? null,
        }));
        const { error: rosterError } = await supabase
          .from(TEAM_MEMBERS_TABLE)
          .insert(rosterInsertPayload);

        if (rosterError) {
          console.error("Admin team roster insert error:", rosterError);
          throw rosterError;
        }
      }

      const { error } = await supabase.from("lfn_teams").update(payload).eq("id", team.id);
      if (error) {
        const code = (error as any).code;
        const details = (error as any).details;
        const hint = (error as any).hint;
        console.error("updateTeam error", {
          message: error.message,
          code,
          details,
          hint,
          payload,
          teamId: team.id,
          raw: error,
        });
        if (String(error.message).includes("lfn_teams_tag_key")) {
          const message = "Tag déjà utilisé. Choisis un autre tag.";
          setErrorMessage(message);
          showToast("error", message);
          return;
        }
        if (String(error.message).toLowerCase().includes("row level security")) {
          const message =
            "Mise à jour refusée (RLS). Vérifie les policies UPDATE sur lfn_teams.";
          setErrorMessage(message);
          showToast("error", message);
          return;
        }
        if (code === "23514") {
          const message = "Valeur invalide (contrainte DB). Vérifie Division / champs requis.";
          setErrorMessage(message);
          showToast("error", message);
          return;
        }
        const errorMessage = `Échec de la mise à jour: ${error.message} (code: ${
          code ?? "n/a"
        }, details: ${details ?? "n/a"}, hint: ${hint ?? "n/a"})`;
        setErrorMessage(errorMessage);
        showToast("error", errorMessage);
        return;
      }

      await loadTeams();
      setOpenTeamIds((prev) =>
        multiOpenTeams ? Array.from(new Set([...prev, team.id])) : [team.id]
      );
      setStatusMessage("Équipe mise à jour.");
      showToast("success", "Équipe mise à jour.");
    } catch (error) {
      console.error("Admin team update error:", error);
      const errorMessage = error instanceof Error ? error.message : "Échec de la mise à jour.";
      setErrorMessage(errorMessage);
      showToast("error", errorMessage);
    }
  };

  const handleCreateTeam = async () => {
    setStatusMessage(null);
    setErrorMessage(null);
    setTeamFormErrors([]);

    const errors: string[] = [];
    if (!teamForm.name.trim()) {
      errors.push("Le nom est obligatoire.");
    }
    if (teamForm.tag && teamForm.tag.trim().length < 2) {
      errors.push("Le tag doit contenir au moins 2 caractères.");
    }
    if (teamForm.division && !DIVISION_OPTIONS.some((option) => option.value === teamForm.division)) {
      errors.push("La division doit être D1 ou D2.");
    }
    if (teamForm.tag && isDuplicateTag(teamForm.tag)) {
      errors.push("Tag déjà utilisé.");
    }

    if (errors.length) {
      setTeamFormErrors(errors);
      return;
    }

    const normalizedTag = teamForm.tag ? teamForm.tag.trim().toUpperCase() : null;
    const normalizedDivision = normalizeDivision(teamForm.division ?? null);

    try {
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamForm.name,
          tag: normalizeNullable(normalizedTag),
          division: normalizeNullable(normalizedDivision),
          logoUrl: normalizeNullable(teamForm.logoUrl),
          statsSummary: normalizeStatsSummary(teamForm.statsSummary),
          mainBrawlers: normalizeMainBrawlers(teamForm.mainBrawlers),
          roster: buildRosterPayload(teamForm.roster),
        }),
      });

      const payload = await response.json();
    if (!response.ok) {
      console.error("Admin team create error:", payload.error || payload);
      setErrorMessage(payload.error || "Création impossible.");
      return;
    }

    setStatusMessage("Équipe créée.");
    setTeamForm({ ...emptyTeamForm, roster: buildRosterTemplate() });
    const createdTeamId =
      payload?.team?.[TEAM_COLUMNS.id] ?? payload?.team?.id ?? payload?.team?.team_id ?? null;
    await loadTeams();
    if (createdTeamId) {
      setOpenTeamIds((prev) =>
        multiOpenTeams ? Array.from(new Set([...prev, createdTeamId])) : [createdTeamId]
      );
    }
  } catch (error) {
      console.error("Admin team create error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Création impossible.");
    }
  };

  const handleCancelTeamEdits = (teamId: string) => {
    setTeams((prev) => {
      const original = teamsSnapshot.find((team) => team.id === teamId);
      if (!original) {
        return prev;
      }
      return prev.map((team) => (team.id === teamId ? original : team));
    });
    setStatusMessage("Modifications annulées.");
  };

  const handleDeleteTeam = async (teamId: string) => {
    setStatusMessage(null);
    setErrorMessage(null);

    const response = await fetch(`/api/admin/teams/${teamId}`, { method: "DELETE" });
    const payload = await response.json();

    if (!response.ok) {
      setErrorMessage(payload.error || "Suppression impossible.");
      return;
    }

    setStatusMessage("Équipe supprimée.");
    setTeams((prev) => prev.filter((team) => team.id !== teamId));
  };

  const resetMatchForm = () => {
    setMatchForm(emptyMatchForm);
    setEditingMatchId(null);
    setMatchFormErrors([]);
  };

  const buildMatchPayload = (form: MatchFormState) => {
    const trimmedStart = form.startTime.trim();
    const scoreA = form.scoreA === "" ? null : Number(form.scoreA);
    const scoreB = form.scoreB === "" ? null : Number(form.scoreB);
    return {
      day: form.day,
      division: form.division,
      startTime: trimmedStart,
      teamAId: form.teamAId,
      teamBId: form.teamBId,
      status: form.status,
      scoreA,
      scoreB,
      notes: form.notes.trim() || null,
      vodUrl: form.vodUrl.trim() || null,
      proofUrl: form.proofUrl.trim() || null,
    };
  };

  const validateMatchForm = (form: MatchFormState) => {
    const errors: string[] = [];

    if (!form.day || !form.division || !form.startTime || !form.teamAId || !form.teamBId) {
      errors.push("Tous les champs principaux doivent être renseignés.");
    }
    if (form.teamAId && form.teamBId && form.teamAId === form.teamBId) {
      errors.push("Les deux équipes doivent être différentes.");
    }
    if (form.division && !DIVISION_OPTIONS.some((option) => option.value === form.division)) {
      errors.push("La division doit être D1 ou D2.");
    }
    if (form.status === "finished") {
      if (form.scoreA === "" || form.scoreB === "") {
        errors.push("Les scores sont obligatoires pour un match terminé.");
      } else if (Number(form.scoreA) < 0 || Number(form.scoreB) < 0) {
        errors.push("Les scores doivent être supérieurs ou égaux à 0.");
      }
    } else if (form.scoreA !== "" || form.scoreB !== "") {
      errors.push("Les scores doivent rester vides tant que le match n'est pas terminé.");
    }

    return errors;
  };

  const handleSubmitMatch = async () => {
    setStatusMessage(null);
    setErrorMessage(null);
    setMatchFormErrors([]);

    const errors = validateMatchForm(matchForm);
    if (errors.length) {
      setMatchFormErrors(errors);
      return;
    }

    const payload = buildMatchPayload(matchForm);
    const sanitizedPayload = {
      ...payload,
      scoreA: payload.status === "finished" ? payload.scoreA : null,
      scoreB: payload.status === "finished" ? payload.scoreB : null,
    };

    try {
      if (editingMatchId) {
        await updateResultMatch(editingMatchId, sanitizedPayload);
        showToast("success", "Match mis à jour.");
      } else {
        await createResultMatch(sanitizedPayload);
        showToast("success", "Match ajouté.");
      }
      resetMatchForm();
      await loadMatches();
    } catch (error) {
      console.error("handleSubmitMatch error", error);
      showToast(
        "error",
        error instanceof Error ? error.message : "Impossible d'enregistrer le match."
      );
    }
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatchId(match.id);
    setMatchForm({
      day: match.day ?? "Day 1",
      division: match.division ?? "",
      startTime: match.startTime ?? "",
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      status: match.status,
      scoreA: match.scoreA !== null ? String(match.scoreA) : "",
      scoreB: match.scoreB !== null ? String(match.scoreB) : "",
      notes: match.notes ?? "",
      vodUrl: match.vodUrl ?? "",
      proofUrl: match.proofUrl ?? "",
    });
  };

  const handleCopyTeamId = async (teamId: string) => {
    try {
      await navigator.clipboard.writeText(teamId);
      setStatusMessage("Identifiant copié.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Copie impossible.");
    }
  };

  const deleteMatch = async (matchId: string) => {
    const ok = window.confirm(
      "Supprimer définitivement ce match ? Cette action est irréversible."
    );
    if (!ok) {
      return;
    }

    setDeletingId(matchId);

    try {
      await deleteResultMatch(matchId);
      showToast("success", "Match supprimé.");
      await loadMatches();
    } catch (error) {
      console.error("deleteMatch error", error);
      showToast(
        "error",
        error instanceof Error ? error.message : "Erreur lors de la suppression du match."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin Control</p>
          <h1 className="text-2xl font-semibold text-white">Panneau d'administration LFN</h1>
          <p className="text-sm text-slate-400">
            Pilotez les équipes, matchs et résultats depuis un seul écran.
          </p>
          <div className="mt-3 inline-flex flex-col rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
            <span className="uppercase tracking-[0.2em] text-[10px] text-amber-100/80">
              Compte à rebours play-offs
            </span>
            <span className="mt-1 text-base font-semibold text-amber-50">
              {playoffsCountdown.label}
            </span>
            <span className="text-[11px] text-amber-100/80">
              Fin le {playoffsDeadlineLabel} (heure belge)
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
            onClick={refreshData}
          >
            {refreshing ? "Actualisation..." : "Actualiser"}
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm ${
                activeTab === "teams"
                  ? "bg-amber-400/90 text-slate-900"
                  : "bg-white/5 text-slate-200"
              }`}
              onClick={() => setActiveTab("teams")}
            >
              Équipes
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm ${
                activeTab === "results"
                  ? "bg-amber-400/90 text-slate-900"
                  : "bg-white/5 text-slate-200"
              }`}
              onClick={() => setActiveTab("results")}
            >
              Résultats
            </button>
          </div>
        </div>
      </header>

      {toastMessage ? (
        <div
          className={`fixed right-6 top-6 z-50 w-[280px] rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            toastMessage.type === "success"
              ? "border-amber-400/40 bg-amber-400/90 text-slate-900"
              : "border-rose-400/40 bg-rose-500/90 text-white"
          }`}
        >
          {toastMessage.message}
        </div>
      ) : null}
      {statusMessage ? <p className="text-sm text-amber-300">{statusMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
      {loading ? <p className="text-sm text-slate-400">Chargement...</p> : null}

      {activeTab === "teams" ? (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {teamSummary.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
                {card.helper ? <p className="text-xs text-slate-400">{card.helper}</p> : null}
              </div>
            ))}
          </div>

          <div className="section-card space-y-4">
            <h2 className="text-lg font-semibold text-white">Nouvelle équipe</h2>
            {teamFormErrors.length ? (
              <ul className="list-disc space-y-1 pl-4 text-xs text-rose-300">
                {teamFormErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            <div className="grid gap-3 md:grid-cols-4">
              <input
                value={teamForm.name}
                onChange={(event) =>
                  setTeamForm((prev) => ({ ...prev, name: sanitizeInput(event.target.value) }))
                }
                placeholder="Nom"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
              <input
                value={teamForm.tag}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, tag: event.target.value }))}
                placeholder="Tag"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
              <select
                value={teamForm.division}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, division: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              >
                <option value="">Division</option>
                {DIVISION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={teamForm.logoUrl}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
                placeholder="Logo URL"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <textarea
                value={teamForm.statsSummary}
                onChange={(event) =>
                  setTeamForm((prev) => ({ ...prev, statsSummary: event.target.value }))
                }
                placeholder="Stats personnalisées"
                className="min-h-[96px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
              <textarea
                value={teamForm.mainBrawlers}
                onChange={(event) =>
                  setTeamForm((prev) => ({ ...prev, mainBrawlers: event.target.value }))
                }
                placeholder="Main brawlers (séparés par des virgules)"
                className="min-h-[96px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
            </div>
            {getBrawlerChips(teamForm.mainBrawlers).length ? (
              <div className="flex flex-wrap gap-2">
                {getBrawlerChips(teamForm.mainBrawlers).map((chip) => (
                  <span
                    key={`new-team-chip-${chip}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">Roster</p>
                <p className="text-xs text-slate-400">
                  Mains et descriptions par joueur. Les perfs se remplissent selon l'équipe.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {ROSTER_SLOTS.map((slot) => {
                  const entry = findRosterEntry(teamForm.roster, slot.role, slot.slot);
                  return (
                    <div
                      key={`${slot.role}-${slot.slot ?? "coach"}`}
                      className="rounded-xl border border-white/10 bg-slate-950/50 p-3"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {slot.label}
                      </p>
                      <div className="mt-2 space-y-2">
                        <input
                          value={entry.name}
                          onChange={(event) =>
                            setTeamForm((prev) => ({
                              ...prev,
                              roster: updateRosterEntry(
                                prev.roster,
                                slot.role,
                                slot.slot,
                                "name",
                                sanitizeInput(event.target.value)
                              ),
                            }))
                          }
                          placeholder="Pseudo"
                          className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                        />
                        <input
                          value={entry.mains ?? ""}
                          onChange={(event) =>
                            setTeamForm((prev) => ({
                              ...prev,
                              roster: updateRosterEntry(
                                prev.roster,
                                slot.role,
                                slot.slot,
                                "mains",
                                event.target.value
                              ),
                            }))
                          }
                          placeholder="Mains (ex: Shelly, Max)"
                          className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                        />
                        <textarea
                          value={entry.description ?? ""}
                          onChange={(event) =>
                            setTeamForm((prev) => ({
                              ...prev,
                              roster: updateRosterEntry(
                                prev.roster,
                                slot.role,
                                slot.slot,
                                "description",
                                event.target.value
                              ),
                            }))
                          }
                          placeholder="Description"
                          className="min-h-[64px] w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                        />
                        <p className="text-[11px] text-slate-500">
                          Perfs auto après enregistrement.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateTeam}
              className="inline-flex items-center justify-center rounded-full bg-amber-400/90 px-5 py-2 text-sm font-semibold text-slate-900"
            >
              Ajouter l'équipe
            </button>
          </div>

          <div className="section-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Équipes</h2>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={teamSearch}
                  onChange={(event) => setTeamSearch(event.target.value)}
                  placeholder="Rechercher un tag ou un nom"
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
                />
                <select
                  value={teamDivision}
                  onChange={(event) => setTeamDivision(event.target.value)}
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
                >
                  <option value="all">Toutes divisions</option>
                  {DIVISION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={teamSortKey}
                  onChange={(event) => setTeamSortKey(event.target.value as "name" | "wins" | "points")}
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
                >
                  <option value="name">Tri: nom</option>
                  <option value="wins">Tri: victoires</option>
                  <option value="points">Tri: points</option>
                </select>
                <button
                  type="button"
                  onClick={() => setTeamSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                >
                  {teamSortDir === "asc" ? "Ascendant" : "Descendant"}
                </button>
                <label className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[11px] text-slate-200">
                  <input
                    type="checkbox"
                    checked={multiOpenTeams}
                    onChange={(event) => handleMultiOpenToggle(event.target.checked)}
                    className="h-3 w-3 rounded border-white/20 bg-transparent text-amber-300"
                  />
                  Multi-ouverture
                </label>
                <button
                  type="button"
                  onClick={expandAllTeams}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                >
                  Tout déplier
                </button>
                <button
                  type="button"
                  onClick={collapseAllTeams}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                >
                  Tout replier
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {teams.length === 0 && !errorMessage ? (
                <p className="text-sm text-slate-400">Aucune équipe enregistrée.</p>
              ) : filteredTeams.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune équipe ne correspond aux filtres.</p>
              ) : (
                filteredTeams.map((team) => {
                  const isOpen = openTeamIds.includes(team.id);
                  const normalizedDivision = normalizeDivision(team.division ?? "");
                  const rosterStats = getTeamRosterStats(team);
                  const isLogoMissing = !team.logoUrl;
                  const isRosterIncomplete = rosterStats.rosterIncomplete;
                  return (
                    <div
                      key={team.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTeamOpen(team.id)}
                        className="flex w-full flex-wrap items-center justify-between gap-4 text-left"
                        aria-expanded={isOpen}
                      >
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-slate-950/60 text-xs font-semibold text-white">
                            {(team.tag ?? "??").slice(0, 4)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-white">
                                {team.tag ?? "TAG ?"}
                              </p>
                              <span className="text-sm text-slate-300">{team.name}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span>{normalizedDivision || "Division ?"}</span>
                              <span>•</span>
                              <span>{rosterStats.membersCount} membre(s)</span>
                              <span>•</span>
                              <span className="text-[11px] text-slate-500">ID: {team.id}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isLogoMissing ? (
                            <span className="rounded-full bg-rose-400/20 px-3 py-1 text-xs text-rose-200">
                              Logo manquant
                            </span>
                          ) : null}
                          {isRosterIncomplete ? (
                            <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs text-amber-200">
                              Roster incomplet
                            </span>
                          ) : null}
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                            {team.wins ?? 0}W - {team.losses ?? 0}L
                          </span>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                            {team.points ?? 0} pts
                          </span>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-200">
                            {isOpen ? "Replier" : "Déplier"}
                          </span>
                        </div>
                      </button>
                      {isOpen ? (
                        <div className="mt-6 space-y-6">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                              <div>
                                <p className="text-sm font-semibold text-white">Identité</p>
                                <p className="text-xs text-slate-400">
                                  Tag, division et branding principal.
                                </p>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <input
                                  value={team.name}
                                  onChange={(event) =>
                                    handleTeamField(team.id, "name", event.target.value)
                                  }
                                  placeholder="Nom"
                                  className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                                />
                                <input
                                  value={team.tag ?? ""}
                                  onChange={(event) =>
                                    handleTeamField(team.id, "tag", event.target.value)
                                  }
                                  placeholder="Tag"
                                  className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                                />
                                <select
                                  value={toDivisionOption(team.division)}
                                  onChange={(event) =>
                                    handleTeamField(team.id, "division", event.target.value)
                                  }
                                  className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                                >
                                  <option value="">Division</option>
                                  {DIVISION_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  value={team.logoUrl ?? ""}
                                  onChange={(event) =>
                                    handleTeamField(team.id, "logoUrl", event.target.value)
                                  }
                                  placeholder="Logo URL"
                                  className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                                />
                              </div>
                              {isLogoMissing ? (
                                <p className="text-xs text-amber-200">
                                  Pensez à ajouter un logo pour l'affichage public.
                                </p>
                              ) : null}
                            </div>
                            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                              <div>
                                <p className="text-sm font-semibold text-white">Contenu</p>
                                <p className="text-xs text-slate-400">
                                  Résumé stats + mains pour les fiches publiques.
                                </p>
                              </div>
                              <textarea
                                value={team.statsSummary ?? ""}
                                onChange={(event) =>
                                  handleTeamField(team.id, "statsSummary", event.target.value)
                                }
                                placeholder="Stats personnalisées (JSON ou texte court)"
                                className="min-h-[96px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                              />
                              <textarea
                                value={team.mainBrawlers ?? ""}
                                onChange={(event) =>
                                  handleTeamField(team.id, "mainBrawlers", event.target.value)
                                }
                                placeholder="Main brawlers (séparés par des virgules)"
                                className="min-h-[72px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                              />
                              {getBrawlerChips(team.mainBrawlers).length ? (
                                <div className="flex flex-wrap gap-2">
                                  {getBrawlerChips(team.mainBrawlers).map((chip) => (
                                    <span
                                      key={`${team.id}-chip-${chip}`}
                                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                                    >
                                      {chip}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white">Membres</p>
                                <p className="text-xs text-slate-400">
                                  {rosterStats.membersCount} membre(s) actifs ·{" "}
                                  {rosterStats.startersCount}/3 titulaires
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                                  Perfs auto: {team.wins ?? 0}W · {team.losses ?? 0}L ·{" "}
                                  {team.points ?? 0} pts
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addRosterMember(team.id)}
                                  className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                                >
                                  Ajouter membre
                                </button>
                              </div>
                            </div>
                            {rosterStats.membersCount === 0 ? (
                              <p className="text-xs text-slate-400">Aucun roster actif.</p>
                            ) : null}
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs text-slate-300">
                                <thead className="border-b border-white/10 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                  <tr>
                                    <th className="px-2 py-2">Slot</th>
                                    <th className="px-2 py-2">Pseudo</th>
                                    <th className="px-2 py-2">Mains</th>
                                    <th className="px-2 py-2">Description</th>
                                    <th className="px-2 py-2">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {team.roster.map((member) => {
                                    const isTemplateSlot = ROSTER_SLOTS.some(
                                      (slot) =>
                                        slot.role === member.role &&
                                        (slot.slot ?? null) === (member.slot ?? null)
                                    );
                                    const slotLabel =
                                      member.role === "coach"
                                        ? "Coach"
                                        : member.role === "starter"
                                          ? `Titulaire ${member.slot ?? "?"}`
                                          : `Sub ${member.slot ?? "?"}`;
                                    return (
                                      <tr key={`${team.id}-${member.role}-${member.slot ?? "coach"}`}>
                                        <td className="px-2 py-2 text-[11px] text-slate-400">
                                          {slotLabel}
                                        </td>
                                        <td className="px-2 py-2">
                                          <input
                                            value={member.name}
                                            onChange={(event) =>
                                              handleTeamRosterField(
                                                team.id,
                                                member.role,
                                                member.slot,
                                                "name",
                                                sanitizeInput(event.target.value)
                                              )
                                            }
                                            placeholder="Pseudo"
                                            className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-white"
                                          />
                                        </td>
                                        <td className="px-2 py-2">
                                          <input
                                            value={member.mains ?? ""}
                                            onChange={(event) =>
                                              handleTeamRosterField(
                                                team.id,
                                                member.role,
                                                member.slot,
                                                "mains",
                                                event.target.value
                                              )
                                            }
                                            placeholder="Mains"
                                            className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-white"
                                          />
                                        </td>
                                        <td className="px-2 py-2">
                                          <input
                                            value={member.description ?? ""}
                                            onChange={(event) =>
                                              handleTeamRosterField(
                                                team.id,
                                                member.role,
                                                member.slot,
                                                "description",
                                                event.target.value
                                              )
                                            }
                                            placeholder="Description"
                                            className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-white"
                                          />
                                        </td>
                                        <td className="px-2 py-2">
                                          <div className="flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleSaveTeam(team)}
                                              className="rounded-full bg-amber-400/90 px-3 py-1 text-[11px] font-semibold text-slate-900"
                                            >
                                              Sauver
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                clearRosterEntry(team.id, member.role, member.slot)
                                              }
                                              className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-200"
                                            >
                                              Effacer
                                            </button>
                                            {!isTemplateSlot ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  removeRosterEntry(team.id, member.role, member.slot)
                                                }
                                                className="rounded-full border border-rose-400/40 px-3 py-1 text-[11px] text-rose-200"
                                              >
                                                Supprimer
                                              </button>
                                            ) : null}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveTeam(team)}
                              className="rounded-full bg-amber-400/90 px-4 py-2 text-xs font-semibold text-slate-900"
                            >
                              Sauvegarder
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelTeamEdits(team.id)}
                              className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyTeamId(team.id)}
                              className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                            >
                              Copier l'ID
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTeam(team.id)}
                              className="rounded-full border border-rose-400/40 px-4 py-2 text-xs text-rose-200"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {matchSummary.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
                {card.helper ? <p className="text-xs text-slate-400">{card.helper}</p> : null}
              </div>
            ))}
          </div>

          <div className="section-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingMatchId ? "Modifier un match" : "Ajouter un match"}
                </h2>
                <p className="text-xs text-slate-400">
                  Renseignez le programme et les scores officiels.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {editingMatchId ? (
                  <button
                    type="button"
                    onClick={resetMatchForm}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                  >
                    Annuler
                  </button>
                ) : null}
              </div>
            </div>

            {matchFormErrors.length ? (
              <ul className="list-disc space-y-1 pl-4 text-xs text-rose-300">
                {matchFormErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={matchForm.day}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, day: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              >
                {DAY_OPTIONS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
              <select
                value={matchForm.division}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, division: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
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
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={matchForm.teamAId}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, teamAId: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
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
                onChange={(event) => setMatchForm((prev) => ({ ...prev, teamBId: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
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
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
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
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white disabled:opacity-50"
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
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white disabled:opacity-50"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <textarea
                value={matchForm.notes}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Notes"
                className="min-h-[80px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
              <input
                value={matchForm.vodUrl}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, vodUrl: event.target.value }))}
                placeholder="VOD URL"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
              <input
                value={matchForm.proofUrl}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, proofUrl: event.target.value }))
                }
                placeholder="Proof URL"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
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
                  className="rounded-full border border-white/10 px-5 py-2 text-sm text-slate-200"
                >
                  Annuler
                </button>
              ) : null}
            </div>
          </div>

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
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
                >
                  <option value="all">Toutes journées</option>
                  {DAY_OPTIONS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <select
                  value={matchDivision}
                  onChange={(event) => setMatchDivision(event.target.value)}
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
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
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
                >
                  <option value="all">Tous statuts</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={resetMatchForm}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
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
                      <th className="px-3 py-2">Day</th>
                      <th className="px-3 py-2">Division</th>
                      <th className="px-3 py-2">Heure</th>
                      <th className="px-3 py-2">Team A</th>
                      <th className="px-3 py-2">Team B</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Score</th>
                      <th className="px-3 py-2">Updated</th>
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
                          <td className="px-3 py-2 text-slate-200">{match.day ?? "—"}</td>
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
                                className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-200"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteMatch(match.id)}
                                disabled={deletingId === match.id}
                                className="rounded-full border border-rose-400/40 px-3 py-1 text-[11px] text-rose-200"
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
    </div>
  );
}
