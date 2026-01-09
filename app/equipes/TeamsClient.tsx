"use client";

import { useMemo, useState } from "react";
import TeamCard from "../components/TeamCard";
import { teams } from "../../src/data";

const divisionOptions = [
  { label: "Toutes", value: "all" },
  { label: "D1", value: "D1" },
  { label: "D2", value: "D2" },
];

export default function TeamsClient() {
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const divisionMatch = divisionFilter === "all" || team.division === divisionFilter;
      const searchMatch = team.name.toLowerCase().includes(search.toLowerCase());
      return divisionMatch && searchMatch;
    });
  }, [divisionFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une équipe"
          className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 md:w-64"
        />
        <div className="flex flex-wrap gap-2">
          {divisionOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDivisionFilter(option.value)}
              className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.3em] transition ${
                divisionFilter === option.value
                  ? "border-amber-300/50 bg-amber-400/10 text-amber-100"
                  : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredTeams.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune équipe trouvée.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
