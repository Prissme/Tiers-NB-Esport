"use client";

import { useMemo, useState } from "react";
import { MAP_PRIORITY, GAME_MODES } from "../../lib/brawler-priority";
import type { RatingWeights } from "../../lib/rating-weights";

const BRAWLER_NAMES = Object.keys(MAP_PRIORITY).sort();

const WEIGHT_LABELS: Record<keyof RatingWeights, string> = {
  kd_coef: "Poids du K/D",
  diff_mult_tier2: "Multiplicateur difficulté (tier 2 - top pick)",
  diff_mult_tier1: "Multiplicateur difficulté (tier 1 - solide)",
  diff_mult_tier0: "Multiplicateur difficulté (tier 0 - sous-optimal)",
  comp_bonus_coef: "Poids niveau de comp",
  pair_synergy_coef: "Poids synergie duo",
  trio_synergy_coef: "Poids synergie trio",
  counter_coef: "Poids counter (comp adverse)",
  mode_fit_bonus: "Bonus fit de mode",
  star_player_bonus: "Bonus Joueur Star",
  dmg_heal_fit_coef: "Poids fit dégâts/soin",
};

type Breakdown = {
  kills: number;
  deaths: number;
  kd: number;
  brawler: string;
  brawlerPriority: 0 | 1 | 2;
  diffMultiplier: number;
  compAvgPriority: number;
  compPriorityBonus: number;
  pairSynergy: number;
  trioSynergy: number;
  pairDetails: { pair: string; ratio: number; effect: number; source: "map" | "global" }[];
  trioDetail: { trio: string; ratio: number; effect: number; source: "map" | "global" } | null;
  opponentComp: string[];
  counterEffect: number;
  counterBonus: number;
  gameMode: string | null;
  mapMode: string | null;
  mapName: string | null;
  modeFitBonus: number;
  starPlayer: boolean;
  starPlayerBonus: number;
  degats: number | null;
  soin: number | null;
  dmgHealFitBonus: number;
};

type RatingResult = { note: number; computationId: string | null; breakdown: Breakdown };

type WeightChange = { key: keyof RatingWeights; before: number; after: number };

// --- Sélecteur de brawler avec recherche ---
function BrawlerSearchSelect({
  value,
  onChange,
  placeholder = "Aucun",
  showPriority = false,
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  showPriority?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BRAWLER_NAMES;
    return BRAWLER_NAMES.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : value || ""}
        placeholder={placeholder}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-neutral-700 bg-neutral-900 shadow-lg">
          <button
            type="button"
            onMouseDown={() => {
              onChange("");
              setQuery("");
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-800"
          >
            {placeholder}
          </button>
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-neutral-500">Aucun brawler trouvé.</p>
          )}
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              onMouseDown={() => {
                onChange(name);
                setQuery("");
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-800"
            >
              {name}
              {showPriority && <span className="text-neutral-500"> (priorité {MAP_PRIORITY[name]})</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PerformanceRatingForm() {
  const [kills, setKills] = useState("8");
  const [deaths, setDeaths] = useState("2");
  const [brawler, setBrawler] = useState("");
  const [comp, setComp] = useState<[string, string, string]>(["", "", ""]);
  const [opponentComp, setOpponentComp] = useState<[string, string, string]>(["", "", ""]);
  const [gameMode, setGameMode] = useState("");
  // Nom précis de la map (ex: "Hard Rock Mine"). gameMode sert déjà de "mode" pour le calcul
  // par map (buildMapKey(mode, name)) côté API — pas besoin d'un champ dupliqué.
  const [mapName, setMapName] = useState("");
  const [starPlayer, setStarPlayer] = useState(false);
  const [degats, setDegats] = useState("");
  const [soin, setSoin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RatingResult | null>(null);
  const [weightChanges, setWeightChanges] = useState<WeightChange[] | null>(null);
  const [directionStatus, setDirectionStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [directionSent, setDirectionSent] = useState<"up" | "down" | null>(null);

  const canSubmit = useMemo(() => {
    const killsNum = Number(kills);
    const deathsNum = Number(deaths);
    return (
      brawler.trim().length > 0 &&
      Number.isFinite(killsNum) &&
      killsNum >= 0 &&
      Number.isFinite(deathsNum) &&
      deathsNum >= 0
    );
  }, [kills, deaths, brawler]);

  // Dégâts et Soin sont liés, mais sans valeur devinée : remplir l'un ne calcule PAS l'autre.
  // On sait juste que le champ non rempli est inférieur à celui rempli (valeur inconnue),
  // donc on l'indique en placeholder ("< X") sans jamais y mettre de faux chiffre.
  function handleDegatsChange(raw: string) {
    setDegats(raw);
  }

  function handleSoinChange(raw: string) {
    setSoin(raw);
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    setWeightChanges(null);
    setDirectionStatus("idle");
    setDirectionSent(null);
    try {
      const res = await fetch("/api/admin/performance-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kills: Number(kills),
          deaths: Number(deaths),
          brawler,
          comp: comp.filter(Boolean),
          opponentComp: opponentComp.filter(Boolean),
          gameMode: gameMode || null,
          mapMode: gameMode || null,
          mapName: mapName.trim() || null,
          starPlayer,
          degats: degats.trim() === "" ? null : Number(degats),
          soin: soin.trim() === "" ? null : Number(soin),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erreur inconnue.");
        return;
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  async function submitDirection(direction: "up" | "down") {
    if (!result?.computationId) return;
    setDirectionSent(direction);
    setDirectionStatus("sending");
    setWeightChanges(null);
    try {
      const res = await fetch("/api/admin/performance-rating/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ computationId: result.computationId, direction }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDirectionStatus("error");
        return;
      }
      setDirectionStatus("sent");
      setWeightChanges(json.changes ?? []);
    } catch {
      setDirectionStatus("error");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-neutral-400">Kills</label>
          <input
            type="number"
            step="1"
            min="0"
            value={kills}
            onChange={(e) => setKills(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-neutral-400">Morts</label>
          <input
            type="number"
            step="1"
            min="0"
            value={deaths}
            onChange={(e) => setDeaths(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-400">Brawler joué</label>
        <BrawlerSearchSelect
          value={brawler}
          onChange={setBrawler}
          placeholder="Rechercher un brawler..."
          showPriority
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-neutral-400">
            Dégâts <span className="text-neutral-600">— inconnu si vide, mais inférieur au Soin rempli</span>
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={degats}
            onChange={(e) => handleDegatsChange(e.target.value)}
            placeholder={soin.trim() !== "" ? `< ${soin}` : "Ex: 12000"}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-neutral-400">Soin</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={soin}
            onChange={(e) => handleSoinChange(e.target.value)}
            placeholder={degats.trim() !== "" ? `< ${degats}` : "Ex: 3000"}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-400">Composition jouée (jusqu'à 3 brawlers)</label>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <BrawlerSearchSelect
              key={i}
              value={comp[i]}
              onChange={(name) => {
                const next = [...comp] as [string, string, string];
                next[i] = name;
                setComp(next);
              }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-400">Mode de jeu</label>
        <select
          value={gameMode}
          onChange={(e) => setGameMode(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
        >
          <option value="">Non précisé</option>
          {GAME_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-400">
          Nom de la map <span className="text-neutral-600">— optionnel, affine les synergies avec les données de cette map précise</span>
        </label>
        <input
          type="text"
          value={mapName}
          onChange={(e) => setMapName(e.target.value)}
          placeholder="Ex: Hard Rock Mine"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-400">Composition adverse (jusqu'à 3 brawlers)</label>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <BrawlerSearchSelect
              key={i}
              value={opponentComp[i]}
              onChange={(name) => {
                const next = [...opponentComp] as [string, string, string];
                next[i] = name;
                setOpponentComp(next);
              }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-400">
          Joueur Star ? <span className="text-neutral-600">(impact décisif sur l'objectif malgré un K/D faible — ex: hard focus coffre en Braquage)</span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStarPlayer(true)}
            className={`rounded-md px-4 py-2 text-sm font-medium border ${
              starPlayer ? "bg-yellow-500 text-black border-yellow-500" : "border-neutral-700 text-neutral-300"
            }`}
          >
            Oui
          </button>
          <button
            type="button"
            onClick={() => setStarPlayer(false)}
            className={`rounded-md px-4 py-2 text-sm font-medium border ${
              !starPlayer ? "bg-neutral-700 text-white border-neutral-700" : "border-neutral-700 text-neutral-300"
            }`}
          >
            Non
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={!canSubmit || loading}
        onClick={handleSubmit}
        className="rounded-md bg-white px-4 py-2 font-medium text-black disabled:opacity-50"
      >
        {loading ? "Calcul..." : "Calculer la note"}
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4 space-y-3">
          <p className="text-3xl font-semibold">{result.note.toFixed(1)}/10</p>
          <ul className="text-sm text-neutral-400 space-y-1">
            <li>
              {result.breakdown.brawler} — priorité draft {result.breakdown.brawlerPriority} → multiplicateur{" "}
              {result.breakdown.diffMultiplier.toFixed(2)}x
            </li>
            <li>
              Niveau de comp moyen: {result.breakdown.compAvgPriority}/2 (bonus{" "}
              {result.breakdown.compPriorityBonus >= 0 ? "+" : ""}
              {result.breakdown.compPriorityBonus})
            </li>
            {result.breakdown.pairDetails.map((p) => (
              <li key={p.pair}>
                Synergie duo {p.pair}: {Math.round(p.ratio * 100)}% d'avis positifs (
                {p.effect >= 0 ? "+" : ""}
                {p.effect}) —{" "}
                <span className="text-neutral-500">
                  {p.source === "map" ? "données de cette map" : "repli global toutes maps"}
                </span>
              </li>
            ))}
            {result.breakdown.trioDetail && (
              <li>
                Synergie trio {result.breakdown.trioDetail.trio}:{" "}
                {Math.round(result.breakdown.trioDetail.ratio * 100)}% d'avis positifs (
                {result.breakdown.trioDetail.effect >= 0 ? "+" : ""}
                {result.breakdown.trioDetail.effect}) —{" "}
                <span className="text-neutral-500">
                  {result.breakdown.trioDetail.source === "map" ? "données de cette map" : "repli global toutes maps"}
                </span>
              </li>
            )}
            {result.breakdown.pairDetails.length === 0 && !result.breakdown.trioDetail && (
              <li>Aucune synergie communautaire enregistrée pour cette comp dans draft_community_evals.</li>
            )}
            {result.breakdown.opponentComp.length > 0 && (
              <li>
                Face à {result.breakdown.opponentComp.join(" + ")}:{" "}
                {result.breakdown.counterEffect > 0 && "avantage mécanique (counter)"}
                {result.breakdown.counterEffect < 0 && "désavantage mécanique (counter subi)"}
                {result.breakdown.counterEffect === 0 && "pas de counter direct connu"} (
                {result.breakdown.counterBonus >= 0 ? "+" : ""}
                {result.breakdown.counterBonus})
              </li>
            )}
            {result.breakdown.gameMode && (
              <li>
                Mode {result.breakdown.gameMode}: fit de rôle (
                {result.breakdown.modeFitBonus >= 0 ? "+" : ""}
                {result.breakdown.modeFitBonus})
              </li>
            )}
            {result.breakdown.starPlayer && (
              <li>
                Joueur Star: impact objectif reconnu malgré le K/D (
                {result.breakdown.starPlayerBonus >= 0 ? "+" : ""}
                {result.breakdown.starPlayerBonus})
              </li>
            )}
            {(result.breakdown.degats !== null || result.breakdown.soin !== null) && (
              <li>
                Dégâts {result.breakdown.degats ?? 0} — Soin {result.breakdown.soin ?? 0}: fit de rôle (
                {result.breakdown.dmgHealFitBonus >= 0 ? "+" : ""}
                {result.breakdown.dmgHealFitBonus})
              </li>
            )}
          </ul>

          <div className="pt-2 border-t border-neutral-800">
            <p className="text-sm text-neutral-400 mb-2">Cette note était trop basse ou trop haute ?</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!result.computationId || directionStatus === "sending"}
                onClick={() => submitDirection("up")}
                title="Le score était trop bas"
                className="flex items-center gap-1 rounded-md border border-neutral-700 px-3 py-2 text-sm disabled:opacity-40"
                style={directionSent === "up" ? { borderColor: "#4ade80", color: "#4ade80" } : undefined}
              >
                ↑ Trop basse
              </button>
              <button
                type="button"
                disabled={!result.computationId || directionStatus === "sending"}
                onClick={() => submitDirection("down")}
                title="Le score était trop haut"
                className="flex items-center gap-1 rounded-md border border-neutral-700 px-3 py-2 text-sm disabled:opacity-40"
                style={directionSent === "down" ? { borderColor: "#f87171", color: "#f87171" } : undefined}
              >
                ↓ Trop haute
              </button>
            </div>
            {directionStatus === "sent" && weightChanges && (
              <div className="mt-2 rounded-md border border-neutral-800 bg-black/30 p-3">
                <p className="text-xs text-green-400 mb-2">
                  Poids ajustés vers {directionSent === "up" ? "le haut" : "le bas"} :
                </p>
                {weightChanges.length > 0 ? (
                  <ul className="text-xs text-neutral-400 space-y-1 font-mono">
                    {weightChanges.map((c) => (
                      <li key={c.key}>
                        {WEIGHT_LABELS[c.key]}: {c.before} → {c.after}{" "}
                        <span className={c.after > c.before ? "text-green-400" : "text-red-400"}>
                          ({c.after > c.before ? "+" : ""}
                          {Math.round((c.after - c.before) * 1000) / 1000})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-neutral-500">Aucun facteur concerné dans ce calcul.</p>
                )}
              </div>
            )}
            {directionStatus === "error" && (
              <p className="text-xs text-red-400 mt-1">Échec de l'enregistrement.</p>
            )}
            {!result.computationId && (
              <p className="text-xs text-neutral-500 mt-1">
                Ce calcul n'a pas pu être enregistré (table performance_rating_computations
                manquante ?), le feedback n'est pas disponible.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
