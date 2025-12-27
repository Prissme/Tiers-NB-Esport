"use client";

import { useMemo, useState } from "react";
import { getStandings, teamMap } from "../lib/lfn-data";

const columns = [
  { key: "team", label: "Team" },
  { key: "wins", label: "Wins" },
  { key: "losses", label: "Losses" },
  { key: "diff", label: "Set Diff" },
  { key: "points", label: "Points" },
];

export default function StandingsPage() {
  const [sortKey, setSortKey] = useState("points");
  const [direction, setDirection] = useState("desc");
  const standings = getStandings();

  const sortedStandings = useMemo(() => {
    const multiplier = direction === "desc" ? -1 : 1;
    return [...standings].sort((a, b) => {
      if (sortKey === "team") {
        const nameA = teamMap.get(a.teamId)?.name ?? "";
        const nameB = teamMap.get(b.teamId)?.name ?? "";
        return nameA.localeCompare(nameB) * multiplier;
      }
      if (a[sortKey] === b[sortKey]) {
        return (b.diff - a.diff) * multiplier;
      }
      return (a[sortKey] - b[sortKey]) * multiplier;
    });
  }, [direction, sortKey, standings]);

  const handleSort = (key) => {
    if (key === sortKey) {
      setDirection((prev) => (prev === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setDirection(key === "team" ? "asc" : "desc");
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-frost">
          Power Rankings
        </p>
        <h1 className="text-4xl font-semibold text-white">Standings</h1>
        <p className="text-frost">
          Click a column header to sort by wins, losses, set differential, or
          points.
        </p>
      </header>

      <section className="glass-panel p-6">
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm text-frost">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.2em] text-white">
                {columns.map((column) => (
                  <th key={column.key} className="py-3">
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-2"
                    >
                      {column.label}
                      {sortKey === column.key ? (
                        <span>{direction === "desc" ? "↓" : "↑"}</span>
                      ) : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStandings.map((row) => {
                const team = teamMap.get(row.teamId);
                return (
                  <tr key={row.teamId} className="border-b border-white/5">
                    <td className="py-3 text-white">{team?.name}</td>
                    <td className="py-3">{row.wins}</td>
                    <td className="py-3">{row.losses}</td>
                    <td className="py-3">{row.diff}</td>
                    <td className="py-3 font-semibold text-white">
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
