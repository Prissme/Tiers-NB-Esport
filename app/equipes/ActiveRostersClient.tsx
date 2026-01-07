"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const slotLabel = (slot: number | null) => {
  if (slot === 1) return "Titulaire 1";
  if (slot === 2) return "Titulaire 2";
  if (slot === 3) return "Titulaire 3";
  if (slot === 4) return "Sub 1";
  if (slot === 5) return "Sub 2";
  if (slot === 6) return "Sub 3";
  return "Coach";
};

const slotOrder = (slot: number | null) => {
  if (slot === 1) return 10;
  if (slot === 2) return 20;
  if (slot === 3) return 30;
  if (slot === 4) return 40;
  if (slot === 5) return 50;
  if (slot === 6) return 60;
  return 70;
};

const normalizeDivision = (division: string | null) => {
  if (!division) return "other";
  const normalized = division.toLowerCase();
  if (normalized.includes("d1") || normalized.includes("div 1")) return "d1";
  if (normalized.includes("d2") || normalized.includes("div 2")) return "d2";
  return "other";
};

const getStringValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((entry) => getStringValue(entry)).filter(Boolean) as string[];
    return items.length > 0 ? items.join(", ") : null;
  }
  return null;
};

type ActiveRosterMember = {
  slot: number | null;
  name: string;
  mains: string | null;
  description: string | null;
};

type ActiveRosterRow = {
  tag?: string | null;
  name?: string | null;
  division?: string | null;
  members_count?: number | null;
  members?: unknown;
  logo_url?: string | null;
  logoUrl?: string | null;
};

const parseSlot = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeMember = (member: unknown): ActiveRosterMember | null => {
  if (typeof member === "string") {
    const name = getStringValue(member);
    return name ? { slot: null, name, mains: null, description: null } : null;
  }
  if (!member || typeof member !== "object") {
    return null;
  }

  const record = member as Record<string, unknown>;
  const name =
    getStringValue(record.name) ??
    getStringValue(record.player_name) ??
    getStringValue(record.playerName) ??
    getStringValue(record.username) ??
    getStringValue(record.tag) ??
    null;
  const mains = getStringValue(record.mains) ?? getStringValue(record.main) ?? null;
  const description = getStringValue(record.description);
  const slot = parseSlot(record.slot);

  if (!name) {
    return null;
  }

  return {
    slot,
    name,
    mains,
    description,
  };
};

const getInitials = (label: string) => {
  const letters = label
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
  return letters.slice(0, 3).toUpperCase();
};

const getTeamKey = (team: ActiveRosterRow) =>
  `${team.tag ?? team.name ?? "team"}-${team.division ?? "division"}`;

const getMembersSorted = (team: ActiveRosterRow) => {
  const membersRaw = Array.isArray(team.members) ? team.members : [];
  const members = membersRaw
    .map((member) => normalizeMember(member))
    .filter(Boolean) as ActiveRosterMember[];
  return members
    .map((member, memberIndex) => ({ member, memberIndex }))
    .sort(
      (a, b) =>
        slotOrder(a.member.slot) - slotOrder(b.member.slot) ||
        a.memberIndex - b.memberIndex
    )
    .map((entry) => entry.member);
};

export default function ActiveRostersClient({ rosters }: { rosters: ActiveRosterRow[] }) {
  const [search, setSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<"all" | "d1" | "d2">("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredRosters = useMemo(() => {
    return rosters.filter((team) => {
      const divisionMatch =
        divisionFilter === "all" || normalizeDivision(team.division ?? null) === divisionFilter;
      const searchMatch = !normalizedSearch
        ? true
        : `${team.tag ?? ""} ${team.name ?? ""}`.toLowerCase().includes(normalizedSearch);
      return divisionMatch && searchMatch;
    });
  }, [divisionFilter, normalizedSearch, rosters]);

  const selectedTeam = useMemo(() => {
    if (!selectedKey) return null;
    return filteredRosters.find((team) => getTeamKey(team) === selectedKey) ?? null;
  }, [filteredRosters, selectedKey]);

  useEffect(() => {
    if (!selectedKey || selectedTeam) return;
    setSelectedKey(null);
  }, [selectedKey, selectedTeam]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Recherche
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tag ou nom d'équipe"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-white outline-none transition focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/20"
              />
            </label>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Division
              <select
                value={divisionFilter}
                onChange={(event) =>
                  setDivisionFilter(event.target.value as "all" | "d1" | "d2")
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-white outline-none transition focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-400/20"
              >
                <option value="all">Toutes</option>
                <option value="d1">D1</option>
                <option value="d2">D2</option>
              </select>
            </label>
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-fuchsia-200">
          {filteredRosters.length} roster{filteredRosters.length > 1 ? "s" : ""}
        </div>
      </div>

      {filteredRosters.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/50 p-10 text-center text-sm text-slate-400">
          Aucun résultat pour ces filtres.
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredRosters.map((team) => {
              const teamName = team.name ?? team.tag ?? "Équipe";
              const teamKey = getTeamKey(team);
              const logoUrl = team.logoUrl ?? team.logo_url ?? null;
              const initials = getInitials(team.tag ?? team.name ?? "Team");
              const isSelected = teamKey === selectedKey;

              return (
                <button
                  type="button"
                  key={teamKey}
                  onClick={() => setSelectedKey(teamKey)}
                  className={`group flex flex-col items-center gap-3 rounded-3xl border px-4 py-6 text-left transition ${
                    isSelected
                      ? "border-fuchsia-400/70 bg-fuchsia-500/10"
                      : "border-white/10 bg-slate-950/70 hover:border-fuchsia-400/50"
                  }`}
                >
                  <LogoBadge label={initials} logoUrl={logoUrl} teamName={teamName} />
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {team.tag ?? team.name ?? "Roster"}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedTeam ? (
            <RosterDetails team={selectedTeam} />
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/50 p-8 text-center text-sm text-slate-400">
              Cliquez sur un logo pour afficher les joueurs et les stats.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RosterDetails({ team }: { team: ActiveRosterRow }) {
  const teamName = team.name ?? team.tag ?? "Équipe";
  const teamTag = team.tag ?? "-";
  const membersSorted = getMembersSorted(team);
  const slotSet = new Set(membersSorted.map((member) => member.slot).filter(Boolean));
  const rosterComplete = [1, 2, 3].every((slot) => slotSet.has(slot));

  return (
    <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_25px_80px_-60px_rgba(56,189,248,0.45)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-8 h-24 w-24 rounded-full bg-fuchsia-500/10 blur-2xl" />
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl" />
      </div>

      <div className="relative z-10 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
            {team.division ?? "Division"}
          </p>
          <h3 className="text-2xl font-semibold text-white">{teamTag}</h3>
          <p className="text-sm text-slate-300">{teamName}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-fuchsia-200">
            {team.members_count ?? membersSorted.length} membres
          </span>
          {rosterComplete ? (
            <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-400/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-fuchsia-200">
              Roster complet
            </span>
          ) : null}
        </div>

        {membersSorted.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5">
            <div className="hidden grid-cols-[140px_1fr_1fr_1.2fr] gap-4 border-b border-white/10 px-4 py-3 text-[0.65rem] uppercase tracking-[0.35em] text-slate-400 md:grid">
              <span>Slot</span>
              <span>Pseudo</span>
              <span>Mains</span>
              <span>Description</span>
            </div>
            <div className="divide-y divide-white/10">
              {membersSorted.map((member, memberIndex) => (
                <div
                  key={`${member.name}-${memberIndex}`}
                  className="grid gap-2 px-4 py-3 text-sm text-slate-200 md:grid-cols-[140px_1fr_1fr_1.2fr]"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {slotLabel(member.slot)}
                  </span>
                  <span className="font-medium text-white">{member.name}</span>
                  <span className="text-slate-300">
                    {member.mains ? member.mains : "—"}
                  </span>
                  <span className="text-slate-400">
                    {member.description ? member.description : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Aucun membre listé pour ce roster.</p>
        )}
      </div>
    </article>
  );
}

function LogoBadge({
  label,
  logoUrl,
  teamName,
}: {
  label: string;
  logoUrl: string | null;
  teamName: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = logoUrl && !failed;

  return (
    <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-[0_0_30px_-16px_rgba(56,189,248,0.6)] sm:h-20 sm:w-20">
      {showImage ? (
        <Image
          src={logoUrl}
          alt={`Logo ${teamName}`}
          width={80}
          height={80}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          unoptimized
        />
      ) : (
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-200">
          {label}
        </span>
      )}
    </div>
  );
}
