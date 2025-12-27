"use client";

import { useMemo, useState } from "react";
import { standings, teamMap } from "../lib/lfn-data";

const sortOptions = [
  { label: "Wins", key: "wins" },
  { label: "Losses", key: "losses" },
  { label: "Diff", key: "diff" },
];

export default function StandingsPage() {
  const [sortKey, setSortKey] = useState("wins");
  const [direction, setDirection] = useState("desc");

  const sortedStandings = useMemo(() => {
    const multiplier = direction === "desc" ? -1 : 1;
    return [...standings].sort((a, b) => {
      if (a[sortKey] === b[sortKey]) {
        return b.diff - a.diff;
      }
      return (a[sortKey] - b[sortKey]) * multiplier;
    });
  }, [direction, sortKey]);

  const handleSort = (key) => {
    if (key === sortKey) {
      setDirection((prev) => (prev === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setDirection("desc");
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-frost">
          Power Rankings
        </p>
        <h1 className="text-4xl font-semibold text-white">Standings</h1>
        <p className="text-frost">
          Sort by wins, losses, or map differential for instant insights.
        </p>
      </header>

      <section className="glass-panel p-6">
        <div className="flex flex-wrap items-center gap-3 text-sm text-frost">
          {sortOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleSort(option.key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                sortKey === option.key
                  ? "border-pulse/60 bg-pulse/20 text-white"
                  : "border-white/10 text-frost hover:border-white/30 hover:text-white"
              }`}
            >
              Sort by {option.label}{" "}
              {sortKey === option.key ? (direction === "desc" ? "↓" : "↑") : ""}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm text-frost">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.2em] text-white">
                <th className="py-3">Team</th>
                <th className="py-3">Wins</th>
                <th className="py-3">Losses</th>
                <th className="py-3">Diff</th>
              </tr>
            </thead>
            <tbody>
              {sortedStandings.map((row) => {
                const team = teamMap.get(row.teamId);
                return (
                  <tr key={row.teamId} className="border-b border-white/5">
                    <td className="py-3 text-white">
                      {team.logo} {team.name}
                    </td>
                    <td className="py-3">{row.wins}</td>
                    <td className="py-3">{row.losses}</td>
                    <td className="py-3">{row.diff}</td>
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
