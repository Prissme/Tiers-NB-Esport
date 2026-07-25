"use client";

import { useState } from "react";
import { MAP_PRIORITY, GAME_MODES } from "../../lib/brawler-priority";

const BRAWLER_NAMES = Object.keys(MAP_PRIORITY);

// Normalise "shelly" / "SHELLY" / " Shelly " -> "Shelly" (nom exact attendu par le bot de draft)
function normalizeBrawlerName(raw: string): string {
  const clean = raw.trim().toLowerCase();
  const found = BRAWLER_NAMES.find((n) => n.toLowerCase() === clean);
  return found ?? raw.trim();
}

type ParsedPlayer = {
  name: string;
  team: "blue" | "red";
  brawler: string;
  kills: number;
  deaths: number;
  damage: number | null;
  healing: number | null;
  starPlayer: boolean;
};

type PlayerRow = ParsedPlayer & {
  comp: [string, string, string];
  opponentComp: [string, string, string];
  gameMode: string;
  mapName: string;
  victory: boolean | null;
  note: number | null;
  computationId: string | null;
  error: string | null;
};

const EXAMPLE_PROMPT = `Analyse ce screenshot de fin de partie Brawl Stars et renvoie UNIQUEMENT un JSON
(pas de texte autour) avec cette structure exacte, pour les 6 joueurs :

{
  "winningTeam": "blue" ou "red",
  "gameMode": "ex: Gem Grab",
  "mapName": "ex: Hard Rock Mine",
  "players": [
    { "name": "pseudo", "team": "blue" ou "red", "brawler": "nom exact du brawler",
      "kills": 0, "deaths": 0, "damage": 0, "healing": 0, "starPlayer": false }
  ]
}

Ne devine jamais un chiffre illisible, mets null dans ce cas plutôt qu'une valeur inventée.`;

function buildRows(data: any, winningTeam: string | null, gameMode: string, mapName: string): PlayerRow[] {
  const players: ParsedPlayer[] = Array.isArray(data.players) ? data.players : [];
  const allBrawlers = players.map((p) => normalizeBrawlerName(p.brawler || ""));

  return players.map((p) => {
    const team = p.team === "red" ? "red" : "blue";
    const teammates = allBrawlers.filter((_, i) => players[i]?.team === team && players[i] !== p).slice(0, 2);
    const opponents = allBrawlers.filter((_, i) => players[i]?.team !== team).slice(0, 3);
    const victory = winningTeam ? winningTeam === team : null;

    return {
      name: p.name || "?",
      team,
      brawler: normalizeBrawlerName(p.brawler || ""),
      kills: Number(p.kills) || 0,
      deaths: Number(p.deaths) || 0,
      damage: p.damage == null ? null : Number(p.damage),
      healing: p.healing == null ? null : Number(p.healing),
      starPlayer: Boolean(p.starPlayer),
      comp: [normalizeBrawlerName(p.brawler || ""), teammates[0] || "", teammates[1] || ""],
      opponentComp: [opponents[0] || "", opponents[1] || "", opponents[2] || ""],
      gameMode,
      mapName,
      victory,
      note: null,
      computationId: null,
      error: null,
    };
  });
}

export default function BatchPasteForm() {
  const [rawJson, setRawJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<PlayerRow[] | null>(null);
  const [computing, setComputing] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  function handleParse() {
    setParseError(null);
    setRows(null);
    try {
      // Tolère un bloc ```json ... ``` copié tel quel depuis Gemini
      const cleaned = rawJson.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      const data = JSON.parse(cleaned);
      if (!Array.isArray(data.players) || data.players.length === 0) {
        setParseError("Le JSON ne contient pas de tableau 'players'.");
        return;
      }
      const winningTeam = data.winningTeam === "blue" || data.winningTeam === "red" ? data.winningTeam : null;
      const built = buildRows(data, winningTeam, data.gameMode ?? "", data.mapName ?? "");
      setRows(built);
    } catch (err) {
      setParseError(err instanceof Error ? `JSON invalide: ${err.message}` : "JSON invalide.");
    }
  }

  function updateRow(index: number, patch: Partial<PlayerRow>) {
    setRows((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  async function computeAll() {
    if (!rows) return;
    setComputing(true);
    try {
      const results = await Promise.all(
        rows.map(async (row) => {
          try {
            const res = await fetch("/api/admin/performance-rating", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                kills: row.kills,
                deaths: row.deaths,
                brawler: row.brawler,
                comp: row.comp.filter(Boolean),
                opponentComp: row.opponentComp.filter(Boolean),
                gameMode: row.gameMode || null,
                mapMode: row.gameMode || null,
                mapName: row.mapName || null,
                starPlayer: row.starPlayer,
                victory: row.victory,
                degats: row.damage,
                soin: row.healing,
              }),
            });
            const json = await res.json();
            if (!res.ok) {
              return { note: null, computationId: null, error: json.error ?? "Erreur inconnue." };
            }
            return { note: json.note as number, computationId: json.computationId ?? null, error: null };
          } catch (err) {
            return { note: null, computationId: null, error: err instanceof Error ? err.message : "Erreur réseau." };
          }
        })
      );

      setRows((prev) =>
        prev
          ? prev.map((row, i) => ({
              ...row,
              note: results[i].note,
              computationId: results[i].computationId,
              error: results[i].error,
            }))
          : prev
      );
    } finally {
      setComputing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">1. Colle le JSON généré par Gemini</p>
          <button
            type="button"
            onClick={() => setShowPrompt((v) => !v)}
            className="text-xs text-neutral-400 underline hover:text-neutral-200"
          >
            {showPrompt ? "Cacher le prompt à utiliser" : "Voir le prompt à coller dans Gemini"}
          </button>
        </div>

        {showPrompt && (
          <pre className="whitespace-pre-wrap rounded-md border border-neutral-800 bg-black/40 p-3 text-xs text-neutral-400">
            {EXAMPLE_PROMPT}
          </pre>
        )}

        <textarea
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          placeholder='{"winningTeam": "blue", "players": [...]}'
          rows={8}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-xs"
        />

        {parseError && <p className="text-sm text-red-400">{parseError}</p>}

        <button
          type="button"
          onClick={handleParse}
          disabled={!rawJson.trim()}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          Remplir les 6 joueurs
        </button>
      </div>

      {rows && (
        <div className="space-y-4">
          <p className="text-sm font-medium">2. Vérifie / corrige, puis calcule les notes</p>

          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={row.team === "blue" ? "text-blue-400" : "text-red-400"}>
                    {row.team === "blue" ? "🔵" : "🔴"}
                  </span>
                  <input
                    value={row.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                    className="w-32 rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
                  />
                  <input
                    value={row.brawler}
                    onChange={(e) => updateRow(i, { brawler: e.target.value })}
                    className="w-28 rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
                    placeholder="Brawler"
                  />
                  <input
                    type="number"
                    value={row.kills}
                    onChange={(e) => updateRow(i, { kills: Number(e.target.value) })}
                    className="w-16 rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
                    title="Kills"
                  />
                  <span className="text-neutral-600">/</span>
                  <input
                    type="number"
                    value={row.deaths}
                    onChange={(e) => updateRow(i, { deaths: Number(e.target.value) })}
                    className="w-16 rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
                    title="Morts"
                  />
                  <input
                    type="number"
                    value={row.damage ?? ""}
                    onChange={(e) => updateRow(i, { damage: e.target.value === "" ? null : Number(e.target.value) })}
                    className="w-24 rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
                    placeholder="Dégâts"
                  />
                  <input
                    type="number"
                    value={row.healing ?? ""}
                    onChange={(e) => updateRow(i, { healing: e.target.value === "" ? null : Number(e.target.value) })}
                    className="w-24 rounded border border-neutral-700 bg-neutral-950 px-2 py-1"
                    placeholder="Soin"
                  />
                  <label className="flex items-center gap-1 text-xs text-neutral-400">
                    <input
                      type="checkbox"
                      checked={row.starPlayer}
                      onChange={(e) => updateRow(i, { starPlayer: e.target.checked })}
                    />
                    ⭐ Star
                  </label>

                  {row.note !== null && (
                    <span className="ml-auto text-lg font-semibold">{row.note.toFixed(1)}/10</span>
                  )}
                  {row.error && <span className="ml-auto text-xs text-red-400">{row.error}</span>}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={computeAll}
            disabled={computing}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {computing ? "Calcul en cours..." : "Calculer les 6 notes"}
          </button>

          <p className="text-xs text-neutral-500">
            Les notes servent de repère pour ajuster l'Elo manuellement — rien n'est appliqué automatiquement.
          </p>
        </div>
      )}
    </div>
  );
}
