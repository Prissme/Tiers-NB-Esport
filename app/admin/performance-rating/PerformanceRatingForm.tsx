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
};

type Breakdown = {
  kd: number;
  brawler: string;
  brawlerPriority: 0 | 1 | 2;
  diffMultiplier: number;
  compAvgPriority: number;
  compPriorityBonus: number;
  pairSynergy: number;
  trioSynergy: number;
  pairDetails: { pair: string; ratio: number; effect: number }[];
  trioDetail: { trio: string; ratio: number; effect: number } | null;
  opponentComp: string[];
  counterEffect: number;
  counterBonus: number;
  gameMode: string | null;
  modeFitBonus: number;
  starPlayer: boolean;
  starPlayerBonus: number;
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
  const [kd, setKd] = useState("1.5");
  const [brawler, setBrawler] = useState("");
  const [comp, setComp] = useState<[string, string, string]>(["", "", ""]);
  const [opponentComp, setOpponentComp] = useState<[string, string, string]>(["", "", ""]);
  const [gameMode, setGameMode] = useState("");
  const [starPlayer, setStarPlayer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RatingResult | null>(null);
  const [feedbackStars, setFeedbackStars] = useState<number | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [weightChanges, setWeightChanges] = useState<WeightChange[] | null>(null);
  const [directionStatus, setDirectionStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [directionSent, setDirectionSent] = useState<"up" | "down" | null>(null);
  const [matchResultStatus, setMatchResultStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [matchResultSent, setMatchResultSent] = useState<"victory" | "defeat" | null>(null);
  const [matchResultChanges, setMatchResultChanges] = useState<WeightChange[] | null>(null);
  const [matchResultNeutral, setMatchResultNeutral] = useState(false);

  const canSubmit = useMemo(() => {
    const kdNum = Number(kd);
    return brawler.trim().length > 0 && Number.isFinite(kdNum) && kdNum >= 0;
  }, [kd, brawler]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    setFeedbackStars(null);
    setFeedbackStatus("idle");
    setWeightChanges(null);
    setDirectionStatus("idle");
    setDirectionSent(null);
    setMatchResultStatus("idle");
    setMatchResultSent(null);
    setMatchResultChanges(null);
    setMatchResultNeutral(false);
    try {
      const res = await fetch("/api/admin/performance-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kd: Number(kd),
          brawler,
          comp: comp.filter(Boolean),
          opponentComp: opponentComp.filter(Boolean),
          gameMode: gameMode || null,
          starPlayer,
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

  async function submitFeedback(stars: number) {
    if (!result?.computationId) return;
    setFeedbackStars(stars);
    setFeedbackStatus("sending");
    setWeightChanges(null);
    try {
      const res = await fetch("/api/admin/performance-rating/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ computationId: result.computationId, stars }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedbackStatus("error");
        return;
      }
      setFeedbackStatus("sent");
      setWeightChanges(json.changes ?? []);
    } catch {
      setFeedbackStatus("error");
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

  async function submitMatchResult(matchResult: "victory" | "defeat") {
    if (!result?.computationId) return;
    setMatchResultSent(matchResult);
    setMatchResultStatus("sending");
    setMatchResultChanges(null);
    setMatchResultNeutral(false);
    try {
      const res = await fetch("/api/admin/performance-rating/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ computationId: result.computationId, matchResult }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMatchResultStatus("error");
        return;
      }
      setMatchResultStatus("sent");
      setMatchResultChanges(json.changes ?? []);
      setMatchResultNeutral(Boolean(json.neutralMatchResult));
    } catch {
      setMatchResultStatus("error");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <label className="text-sm text-neutral-400">K/D</label>
        <input
          type="number"
          step="0.1"
          min="0"
          value={kd}
          onChange={(e) => setKd(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
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
                {p.effect})
              </li>
            ))}
            {result.breakdown.trioDetail && (
              <li>
                Synergie trio {result.breakdown.trioDetail.trio}:{" "}
                {Math.round(result.breakdown.trioDetail.ratio * 100)}% d'avis positifs (
                {result.breakdown.trioDetail.effect >= 0 ? "+" : ""}
                {result.breakdown.trioDetail.effect})
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
          </ul>

          <div className="pt-2 border-t border-neutral-800">
            <p className="text-sm text-neutral-400 mb-2">
              Résultat réel du match ? Ça recale l'algo selon si la note collait au résultat.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!result.computationId || matchResultStatus === "sending"}
                onClick={() => submitMatchResult("victory")}
                className="flex items-center gap-1 rounded-md border border-neutral-700 px-3 py-2 text-sm disabled:opacity-40"
                style={matchResultSent === "victory" ? { borderColor: "#4ade80", color: "#4ade80" } : undefined}
              >
                🏆 Victoire
              </button>
              <button
                type="button"
                disabled={!result.computationId || matchResultStatus === "sending"}
                onClick={() => submitMatchResult("defeat")}
                className="flex items-center gap-1 rounded-md border border-neutral-700 px-3 py-2 text-sm disabled:opacity-40"
                style={matchResultSent === "defeat" ? { borderColor: "#f87171", color: "#f87171" } : undefined}
              >
                💀 Défaite
              </button>
            </div>
            {matchResultStatus === "sent" && matchResultNeutral && (
              <p className="text-xs text-neutral-500 mt-2">
                Note trop proche de 5/10 pour trancher : aucun poids modifié.
              </p>
            )}
            {matchResultStatus === "sent" && !matchResultNeutral && (
              <div className="mt-2 rounded-md border border-neutral-800 bg-black/30 p-3">
                <p className="text-xs text-green-400 mb-2">
                  {matchResultSent === "victory" ? "Victoire" : "Défaite"} enregistrée. Poids ajustés :
                </p>
                {matchResultChanges && matchResultChanges.length > 0 ? (
                  <ul className="text-xs text-neutral-400 space-y-1 font-mono">
                    {matchResultChanges.map((c) => (
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
            {matchResultStatus === "error" && (
              <p className="text-xs text-red-400 mt-1">Échec de l'enregistrement du résultat.</p>
            )}
          </div>

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
          </div>

          <div className="pt-2 border-t border-neutral-800">
            <p className="text-sm text-neutral-400 mb-2">
              Cette note te semble fiable ? Note-la pour ajuster l'algorithme en temps réel.
            </p>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={!result.computationId || feedbackStatus === "sending"}
                  onClick={() => submitFeedback(n)}
                  title={`${n} étoile${n > 1 ? "s" : ""}`}
                  className="text-2xl leading-none disabled:opacity-40"
                  style={{ color: feedbackStars !== null && n <= feedbackStars ? "#facc15" : "#525252" }}
                >
                  ★
                </button>
              ))}
            </div>
            {!result.computationId && (
              <p className="text-xs text-neutral-500 mt-1">
                Ce calcul n'a pas pu être enregistré (table performance_rating_computations
                manquante ?), le feedback n'est pas disponible.
              </p>
            )}
            {feedbackStatus === "sent" && (
              <div className="mt-2 rounded-md border border-neutral-800 bg-black/30 p-3">
                <p className="text-xs text-green-400 mb-2">
                  Merci, feedback enregistré ({feedbackStars} ★). Voici ce que l'algo a modifié :
                </p>
                {weightChanges && weightChanges.length > 0 ? (
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
                  <p className="text-xs text-neutral-500">
                    Aucun poids modifié (3 étoiles = jugé correct, ou aucun facteur concerné n'a été utilisé
                    dans ce calcul).
                  </p>
                )}
              </div>
            )}
            {feedbackStatus === "error" && (
              <p className="text-xs text-red-400 mt-1">Échec de l'enregistrement du feedback.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
