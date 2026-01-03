"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "../../src/lib/supabase/browser";
import {
  STANDINGS_VIEW,
  TEAM_COLUMNS,
  TEAM_MEMBER_COLUMNS,
  TEAM_MEMBERS_TABLE,
} from "../../src/lib/supabase/config";
import { withSchema } from "../../src/lib/supabase/schema";

type Team = {
  id: string;
  name: string;
  tag: string | null;
  division: string | null;
  logoUrl: string | null;
  statsSummary: string | null;
  mainBrawlers: string | null;
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

type MatchTeam = {
  id: string | null;
  name: string;
  tag: string | null;
  logoUrl: string | null;
  division: string | null;
};

type Match = {
  id: string;
  status: string | null;
  scheduledAt: string | null;
  bestOf: number | null;
  scoreA: number | null;
  scoreB: number | null;
  division: string | null;
  teamA: MatchTeam;
  teamB: MatchTeam;
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

const emptyMatchForm = {
  scheduledAt: "",
  division: "",
  teamAId: "",
  teamBId: "",
  bestOf: "3",
  status: "scheduled",
};

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Programmé" },
  { value: "live", label: "En cours" },
  { value: "completed", label: "Terminé" },
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

const toLocalInputValue = (value: string | null) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

const normalizeNullable = (value: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeMainBrawlers = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
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

const normalizeDivision = (division?: string | null) => {
  const raw = String(division ?? "").trim();
  const upper = raw.toUpperCase();
  if (["D1", "DIV1", "DIVISION 1", "DIVISION_1", "division_1"].includes(upper) || raw === "division_1") {
    return "Division 1";
  }
  if (["D2", "DIV2", "DIVISION 2", "DIVISION_2", "division_2"].includes(upper) || raw === "division_2") {
    return "Division 2";
  }
  if (raw === "Division 1" || raw === "Division 2") {
    return raw;
  }
  return raw;
};

const toDivisionOption = (division?: string | null) => {
  const normalized = normalizeDivision(division ?? "");
  if (normalized === "Division 1") {
    return "D1";
  }
  if (normalized === "Division 2") {
    return "D2";
  }
  return division ?? "";
};

const formatSchedule = (value: string | null) => {
  if (!value) {
    return "À planifier";
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
      return "bg-emerald-400/20 text-emerald-200";
    case "completed":
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
    case "completed":
      return "Terminé";
    case "scheduled":
      return "Programmé";
    default:
      return "Programmé";
  }
};

const normalizeMatchStatus = (status?: string | null) => {
  if (status === "live" || status === "completed" || status === "scheduled") {
    return status;
  }
  return "scheduled";
};

const sanitizeInput = (value: string) => value.replace(/\s+/g, " ").trimStart();

export default function AdminPanel() {
  const supabase = useMemo(() => withSchema(createBrowserClient()), []);
  const [activeTab, setActiveTab] = useState<"teams" | "matches">("teams");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsSnapshot, setTeamsSnapshot] = useState<Team[]>([]);
  const [matchesLive, setMatchesLive] = useState<Match[]>([]);
  const [matchesRecent, setMatchesRecent] = useState<Match[]>([]);
  const [teamForm, setTeamForm] = useState({
    ...emptyTeamForm,
    roster: buildRosterTemplate(),
  });
  const [matchForm, setMatchForm] = useState(emptyMatchForm);
  const [teamFormErrors, setTeamFormErrors] = useState<string[]>([]);
  const [matchFormErrors, setMatchFormErrors] = useState<string[]>([]);
  const [matchEdits, setMatchEdits] = useState<
    Record<string, { scheduledAt: string; status: string; bestOf: string; division: string }>
  >({});
  const [resultScores, setResultScores] = useState<Record<string, { scoreA: string; scoreB: string }>>({});
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
  const [matchSearch, setMatchSearch] = useState("");
  const [matchDivision, setMatchDivision] = useState("all");
  const [matchStatus, setMatchStatus] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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

  const mapTeamRow = (row: Record<string, unknown>) => ({
    id: String(row[TEAM_COLUMNS.id] ?? ""),
    name: String(row[TEAM_COLUMNS.name] ?? ""),
    tag: row[TEAM_COLUMNS.tag] ? String(row[TEAM_COLUMNS.tag]) : null,
    division: row[TEAM_COLUMNS.division] ? String(row[TEAM_COLUMNS.division]) : null,
    logoUrl: row[TEAM_COLUMNS.logoUrl] ? String(row[TEAM_COLUMNS.logoUrl]) : null,
    statsSummary: toTextValue(row[TEAM_COLUMNS.statsSummary]),
    mainBrawlers: toTextValue(row[TEAM_COLUMNS.mainBrawlers]),
    wins: toNumber(row[TEAM_COLUMNS.wins]),
    losses: toNumber(row[TEAM_COLUMNS.losses]),
    points: toNumber(row[TEAM_COLUMNS.points]),
  });

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
    const [{ data, error }, standingsResponse, membersResponse] = await Promise.all([
      supabase.from("lfn_teams").select("*").order("created_at", { ascending: false }),
      supabase.from(STANDINGS_VIEW).select("*"),
      supabase.from(TEAM_MEMBERS_TABLE).select("*"),
    ]);

    if (error || standingsResponse.error || membersResponse.error) {
      throw new Error(
        error?.message || standingsResponse.error?.message || membersResponse.error?.message
      );
    }

    const membersByTeam = new Map<string, ReturnType<typeof mapMemberRow>[]>();
    (membersResponse.data ?? []).forEach((row) => {
      const mapped = mapMemberRow(row as Record<string, unknown>);
      if (!membersByTeam.has(mapped.teamId)) {
        membersByTeam.set(mapped.teamId, []);
      }
      membersByTeam.get(mapped.teamId)?.push(mapped);
    });

    const standingsByTeam = new Map(
      (standingsResponse.data ?? []).map((row) => [String(row.team_id ?? row.teamId ?? ""), row])
    );

    const teamsList = Array.isArray(data) ? data : [];
    const normalizedTeams = teamsList.map((row) => {
      const mapped = mapTeamRow(row as Record<string, unknown>);
      const standing = standingsByTeam.get(mapped.id);
      const resolved = standing
        ? {
            ...mapped,
            wins: toNumber(standing.wins ?? standing.wins_count),
            losses: toNumber(standing.losses ?? standing.losses_count),
            points: toNumber(standing.points_total ?? standing.points ?? standing.points_total_count),
          }
        : mapped;
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

  const loadMatches = useCallback(async () => {
    const [liveResponse, recentResponse] = await Promise.all([
      fetch("/api/site/matches?status=live&limit=20", { cache: "no-store" }),
      fetch("/api/site/matches?status=recent&limit=20", { cache: "no-store" }),
    ]);

    const livePayload = await liveResponse.json();
    const recentPayload = await recentResponse.json();

    if (!liveResponse.ok || !recentResponse.ok) {
      throw new Error(
        livePayload.error || recentPayload.error || "Erreur lors du chargement des matchs."
      );
    }

    setMatchesLive(Array.isArray(livePayload?.matches) ? livePayload.matches : []);
    setMatchesRecent(Array.isArray(recentPayload?.matches) ? recentPayload.matches : []);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const teamsList = await loadTeams();

      if (teamsList.length === 0) {
        setMatchesLive([]);
        setMatchesRecent([]);
        return;
      }

      await loadMatches();
    } catch (error) {
      console.error("Admin load data error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.");
      setTeams([]);
      setMatchesLive([]);
      setMatchesRecent([]);
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
    setMatchEdits((prev) => {
      const next = { ...prev };
      const allMatches = [...matchesLive, ...matchesRecent];
      allMatches.forEach((match) => {
        if (!next[match.id]) {
          next[match.id] = {
            scheduledAt: toLocalInputValue(match.scheduledAt),
            status: normalizeMatchStatus(match.status),
            bestOf: match.bestOf ? String(match.bestOf) : "",
            division: match.division ?? "",
          };
        }
      });
      return next;
    });
  }, [matchesLive, matchesRecent]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeout = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToastMessage({ type, message });
  }, []);

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
    const liveCount = matchesLive.length;
    const recentCount = matchesRecent.length;
    const totalCount = liveCount + recentCount;
    const cards: SummaryCard[] = [
      { label: "Matchs actifs", value: String(liveCount), helper: "En cours ou à venir" },
      { label: "Matchs récents", value: String(recentCount), helper: "Déjà joués" },
      { label: "Total chargés", value: String(totalCount), helper: "Dernières entrées" },
    ];
    return cards;
  }, [matchesLive, matchesRecent]);

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

  const getBrawlerChips = (value: string | null) => normalizeMainBrawlers(value);

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
    const searchLower = matchSearch.trim().toLowerCase();
    const allMatches = [...matchesLive, ...matchesRecent];
    return allMatches.filter((match) => {
      const matchesSearch =
        !searchLower ||
        match.teamA.name.toLowerCase().includes(searchLower) ||
        match.teamB.name.toLowerCase().includes(searchLower);
      const matchesDivision = matchDivision === "all" || (match.division ?? "") === matchDivision;
    const matchesStatus =
      matchStatus === "all" || normalizeMatchStatus(match.status) === matchStatus;
      return matchesSearch && matchesDivision && matchesStatus;
    });
  }, [matchDivision, matchSearch, matchStatus, matchesLive, matchesRecent]);

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

  const normalizeTeamPayload = (team: Team) => {
    const normalizedTag = team.tag ? team.tag.trim().toUpperCase() : "";
    const normalizedDivision = normalizeDivision(team.division ?? null);

    return {
      [TEAM_COLUMNS.id]: team.id,
      [TEAM_COLUMNS.name]: sanitizeInput(team.name),
      [TEAM_COLUMNS.tag]: normalizeNullable(normalizedTag),
      [TEAM_COLUMNS.division]: normalizeNullable(normalizedDivision),
      [TEAM_COLUMNS.logoUrl]: normalizeNullable(team.logoUrl),
      [TEAM_COLUMNS.statsSummary]: normalizeStatsSummary(team.statsSummary),
      [TEAM_COLUMNS.mainBrawlers]: normalizeMainBrawlers(team.mainBrawlers),
    };
  };

  const handleSaveTeam = async (team: Team) => {
    setStatusMessage(null);
    setErrorMessage(null);

    if (isDuplicateTag(team.tag, team.id)) {
      setErrorMessage("Tag déjà utilisé.");
      return;
    }

    const normalizedPayload = normalizeTeamPayload(team);

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

      const { data, error } = await supabase.rpc("save_lfn_team", { p: normalizedPayload });
      if (error) {
        console.error("Admin team update error:", error);
        throw error;
      }

      const saved = Array.isArray(data) ? data[0] : data;

      await loadTeams();
      if (saved?.id) {
        setOpenTeamIds((prev) =>
          multiOpenTeams ? Array.from(new Set([...prev, saved.id])) : [saved.id]
        );
      }
      setStatusMessage("Équipe sauvegardée.");
    } catch (error) {
      console.error("Admin team update error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Échec de la mise à jour.");
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

  const handleCreateMatch = async () => {
    setStatusMessage(null);
    setErrorMessage(null);
    setMatchFormErrors([]);

    const errors: string[] = [];
    if (!matchForm.scheduledAt || !matchForm.teamAId || !matchForm.teamBId) {
      errors.push("Veuillez renseigner la date et les deux équipes.");
    }
    if (matchForm.teamAId && matchForm.teamBId && matchForm.teamAId === matchForm.teamBId) {
      errors.push("Les deux équipes doivent être différentes.");
    }
    if (matchForm.bestOf && Number(matchForm.bestOf) <= 0) {
      errors.push("Le format Best Of doit être supérieur à 0.");
    }
    if (matchForm.division && !DIVISION_OPTIONS.some((option) => option.value === matchForm.division)) {
      errors.push("La division doit être D1 ou D2.");
    }

    if (errors.length) {
      setMatchFormErrors(errors);
      return;
    }

    const scheduledAt = matchForm.scheduledAt ? new Date(matchForm.scheduledAt).toISOString() : "";

    const response = await fetch("/api/admin/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt,
        division: matchForm.division || null,
        teamAId: matchForm.teamAId,
        teamBId: matchForm.teamBId,
        bestOf: matchForm.bestOf ? Number(matchForm.bestOf) : undefined,
        status: matchForm.status || undefined,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setErrorMessage(payload.error || "Création du match impossible.");
      return;
    }

    setStatusMessage("Match créé.");
    setMatchForm(emptyMatchForm);
    await loadData();
  };

  const handleResultChange = (matchId: string, field: "scoreA" | "scoreB", value: string) => {
    setResultScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value },
    }));
  };

  const handleSubmitResult = async (matchId: string) => {
    setStatusMessage(null);
    setErrorMessage(null);

    const scores = resultScores[matchId];
    if (!scores) {
      setErrorMessage("Scores manquants.");
      return;
    }

    const response = await fetch(`/api/admin/matches/${matchId}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scoreA: scores.scoreA,
        scoreB: scores.scoreB,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setErrorMessage(payload.error || "Validation impossible.");
      return;
    }

    setStatusMessage("Résultat enregistré.");
    await loadData();
  };

  const handleMatchEditChange = (
    matchId: string,
    field: "scheduledAt" | "status" | "bestOf" | "division",
    value: string
  ) => {
    setMatchEdits((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value },
    }));
  };

  const handleQuickStatus = (matchId: string, status: string) => {
    handleMatchEditChange(matchId, "status", status);
  };

  const handleQuickDivision = (matchId: string, division: string) => {
    handleMatchEditChange(matchId, "division", division);
  };

  const handleCopyTeamId = async (teamId: string) => {
    try {
      await navigator.clipboard.writeText(teamId);
      setStatusMessage("Identifiant copié.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Copie impossible.");
    }
  };

  const handleSaveMatch = async (matchId: string) => {
    setStatusMessage(null);
    setErrorMessage(null);

    const edits = matchEdits[matchId];
    if (!edits) {
      setErrorMessage("Aucune modification à enregistrer.");
      return;
    }

    const payload: Record<string, string | number> = {};

    if (edits.scheduledAt) {
      payload.scheduledAt = new Date(edits.scheduledAt).toISOString();
    }
    if (edits.status) {
      payload.status = edits.status;
    }
    if (edits.bestOf) {
      payload.bestOf = Number(edits.bestOf);
    }
    if (edits.division) {
      payload.division = edits.division;
    }

    if (Object.keys(payload).length === 0) {
      setErrorMessage("Aucune modification à enregistrer.");
      return;
    }

    const response = await fetch(`/api/admin/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      setErrorMessage(result.error || "Mise à jour impossible.");
      return;
    }

    setStatusMessage("Match mis à jour.");
    await loadData();
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
      const { error } = await supabase.from("lfn_matches").delete().eq("id", matchId);

      if (error) {
        throw error;
      }

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
                  ? "bg-emerald-400/90 text-slate-900"
                  : "bg-white/5 text-slate-200"
              }`}
              onClick={() => setActiveTab("teams")}
            >
              Équipes
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm ${
                activeTab === "matches"
                  ? "bg-emerald-400/90 text-slate-900"
                  : "bg-white/5 text-slate-200"
              }`}
              onClick={() => setActiveTab("matches")}
            >
              Matchs
            </button>
          </div>
        </div>
      </header>

      {toastMessage ? (
        <div
          className={`fixed right-6 top-6 z-50 w-[280px] rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            toastMessage.type === "success"
              ? "border-emerald-400/40 bg-emerald-400/90 text-slate-900"
              : "border-rose-400/40 bg-rose-500/90 text-white"
          }`}
        >
          {toastMessage.message}
        </div>
      ) : null}
      {statusMessage ? <p className="text-sm text-emerald-300">{statusMessage}</p> : null}
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
              className="inline-flex items-center justify-center rounded-full bg-emerald-400/90 px-5 py-2 text-sm font-semibold text-slate-900"
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
                    className="h-3 w-3 rounded border-white/20 bg-transparent text-emerald-300"
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
                                              className="rounded-full bg-emerald-400/90 px-3 py-1 text-[11px] font-semibold text-slate-900"
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
                              className="rounded-full bg-emerald-400/90 px-4 py-2 text-xs font-semibold text-slate-900"
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
            <h2 className="text-lg font-semibold text-white">Créer un match</h2>
            {matchFormErrors.length ? (
              <ul className="list-disc space-y-1 pl-4 text-xs text-rose-300">
                {matchFormErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="datetime-local"
                value={matchForm.scheduledAt}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, scheduledAt: event.target.value }))
                }
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
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
                value={matchForm.bestOf}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, bestOf: event.target.value }))}
                placeholder="Best of"
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
                onChange={(event) => setMatchForm((prev) => ({ ...prev, status: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleCreateMatch}
              className="inline-flex items-center justify-center rounded-full bg-emerald-400/90 px-5 py-2 text-sm font-semibold text-slate-900"
            >
              Ajouter le match
            </button>
          </div>

          <div className="section-card space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Pilotage des matchs</h2>
                <p className="text-xs text-slate-400">Filtrez, modifiez ou validez rapidement.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={matchSearch}
                  onChange={(event) => setMatchSearch(event.target.value)}
                  placeholder="Recherche équipe"
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
                />
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
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">En cours / à venir</h2>
              <div className="mt-4 space-y-3">
                {matchesLive.length === 0 ? (
                  <p className="text-sm text-slate-400">Aucun match en cours.</p>
                ) : (
                  matchesLive.map((match) => {
                    const isCompleted = match.status === "completed";
                    const isDeleting = deletingId === match.id;

                    return (
                      <div
                        key={match.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div>
                          <p className="text-sm text-white">
                            {match.teamA.name} vs {match.teamB.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatSchedule(match.scheduledAt)} ·{" "}
                            {statusLabel(normalizeMatchStatus(match.status))}
                          </p>
                        </div>
                        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusBadgeClass(
                              match.status
                            )}`}
                          >
                            {statusLabel(normalizeMatchStatus(match.status))}
                          </span>
                          <input
                            type="datetime-local"
                            value={matchEdits[match.id]?.scheduledAt ?? ""}
                            onChange={(event) =>
                              handleMatchEditChange(match.id, "scheduledAt", event.target.value)
                            }
                            className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                          />
                          <select
                            value={matchEdits[match.id]?.division ?? ""}
                            onChange={(event) =>
                              handleMatchEditChange(match.id, "division", event.target.value)
                            }
                            className="w-28 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                          >
                            <option value="">Division</option>
                            {DIVISION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            value={matchEdits[match.id]?.bestOf ?? ""}
                            onChange={(event) =>
                              handleMatchEditChange(match.id, "bestOf", event.target.value)
                            }
                            placeholder="Best of"
                            className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                          />
                          <select
                            value={matchEdits[match.id]?.status ?? ""}
                            onChange={(event) =>
                              handleMatchEditChange(match.id, "status", event.target.value)
                            }
                            className="w-28 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            {STATUS_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleQuickStatus(match.id, option.value)}
                                className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-200"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          <input
                            value={resultScores[match.id]?.scoreA ?? ""}
                            onChange={(event) =>
                              handleResultChange(match.id, "scoreA", event.target.value)
                            }
                            placeholder="Score A"
                            className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                          />
                          <input
                            value={resultScores[match.id]?.scoreB ?? ""}
                            onChange={(event) =>
                              handleResultChange(match.id, "scoreB", event.target.value)
                            }
                            placeholder="Score B"
                            className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleSubmitResult(match.id)}
                            className="rounded-full bg-emerald-400/90 px-4 py-2 text-xs font-semibold text-slate-900"
                          >
                            Valider
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveMatch(match.id)}
                            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                          >
                            Mettre à jour
                          </button>
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              onClick={() => deleteMatch(match.id)}
                              disabled={isCompleted || isDeleting}
                              title={
                                isCompleted
                                  ? "Impossible de supprimer un match terminé."
                                  : "Supprimer ce match"
                              }
                              className={`inline-flex items-center gap-2 rounded-full border border-rose-400/40 px-4 py-2 text-xs ${
                                isCompleted || isDeleting
                                  ? "cursor-not-allowed bg-rose-500/30 text-rose-100/70"
                                  : "bg-rose-500/90 text-white"
                              }`}
                            >
                              {isDeleting ? (
                                "Suppression..."
                              ) : (
                                <>
                                  <span aria-hidden="true">🗑️</span>
                                  <span>Supprimer</span>
                                </>
                              )}
                            </button>
                            {isCompleted ? (
                              <span className="text-[10px] text-rose-300">
                                Impossible de supprimer un match terminé.
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">Récents</h2>
              <div className="mt-4 space-y-3">
                {matchesRecent.length === 0 ? (
                  <p className="text-sm text-slate-400">Aucun match récent.</p>
                ) : (
                  matchesRecent.map((match) => {
                    const isCompleted = match.status === "completed";
                    const isDeleting = deletingId === match.id;

                    return (
                      <div
                        key={match.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div>
                          <p className="text-sm text-white">
                            {match.teamA.name} {match.scoreA ?? "-"} - {match.scoreB ?? "-"} {match.teamB.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatSchedule(match.scheduledAt)} ·{" "}
                            {statusLabel(normalizeMatchStatus(match.status))}
                          </p>
                        </div>
                        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusBadgeClass(
                              match.status
                            )}`}
                          >
                            {statusLabel(normalizeMatchStatus(match.status))}
                          </span>
                          <input
                            type="datetime-local"
                            value={matchEdits[match.id]?.scheduledAt ?? ""}
                            onChange={(event) =>
                              handleMatchEditChange(match.id, "scheduledAt", event.target.value)
                            }
                            className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                          />
                          <select
                            value={matchEdits[match.id]?.division ?? ""}
                            onChange={(event) =>
                              handleMatchEditChange(match.id, "division", event.target.value)
                            }
                            className="w-28 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                          >
                            <option value="">Division</option>
                            {DIVISION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            value={matchEdits[match.id]?.bestOf ?? ""}
                            onChange={(event) =>
                              handleMatchEditChange(match.id, "bestOf", event.target.value)
                            }
                            placeholder="Best of"
                            className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                          />
                          <select
                            value={matchEdits[match.id]?.status ?? ""}
                            onChange={(event) =>
                              handleMatchEditChange(match.id, "status", event.target.value)
                            }
                            className="w-28 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            {DIVISION_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleQuickDivision(match.id, option.value)}
                                className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-200"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          <input
                            value={resultScores[match.id]?.scoreA ?? String(match.scoreA ?? "")}
                            onChange={(event) =>
                              handleResultChange(match.id, "scoreA", event.target.value)
                            }
                            placeholder="Score A"
                            className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                          />
                          <input
                            value={resultScores[match.id]?.scoreB ?? String(match.scoreB ?? "")}
                            onChange={(event) =>
                              handleResultChange(match.id, "scoreB", event.target.value)
                            }
                            placeholder="Score B"
                            className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleSubmitResult(match.id)}
                            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                          >
                            Mettre à jour score
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveMatch(match.id)}
                            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                          >
                            Mettre à jour match
                          </button>
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              onClick={() => deleteMatch(match.id)}
                              disabled={isCompleted || isDeleting}
                              title={
                                isCompleted
                                  ? "Impossible de supprimer un match terminé."
                                  : "Supprimer ce match"
                              }
                              className={`inline-flex items-center gap-2 rounded-full border border-rose-400/40 px-4 py-2 text-xs ${
                                isCompleted || isDeleting
                                  ? "cursor-not-allowed bg-rose-500/30 text-rose-100/70"
                                  : "bg-rose-500/90 text-white"
                              }`}
                            >
                              {isDeleting ? (
                                "Suppression..."
                              ) : (
                                <>
                                  <span aria-hidden="true">🗑️</span>
                                  <span>Supprimer</span>
                                </>
                              )}
                            </button>
                            {isCompleted ? (
                              <span className="text-[10px] text-rose-300">
                                Impossible de supprimer un match terminé.
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {filteredMatches.length === 0 ? (
              <p className="text-xs text-slate-400">Aucun match ne correspond aux filtres.</p>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                <p className="font-semibold text-white">Matches filtrés</p>
                <ul className="mt-2 space-y-1">
                  {filteredMatches.slice(0, 8).map((match) => (
                    <li key={`filtered-${match.id}`} className="flex items-center justify-between">
                      <span>
                        {match.teamA.name} vs {match.teamB.name}
                      </span>
                      <span className="text-slate-400">
                        {match.division ?? "?"} · {statusLabel(normalizeMatchStatus(match.status))}
                      </span>
                    </li>
                  ))}
                </ul>
                {filteredMatches.length > 8 ? (
                  <p className="mt-2 text-slate-400">
                    +{filteredMatches.length - 8} match(s) supplémentaires.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
