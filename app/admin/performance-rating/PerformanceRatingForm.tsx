"use client";

import { useMemo, useState } from "react";
import { MAP_PRIORITY, GAME_MODES } from "../../lib/brawler-priority";

const BRAWLER_NAMES = Object.keys(MAP_PRIORITY).sort();

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
};

type RatingResult = { note: number; computationId: string | null; breakdown: Breakdown };

export default function PerformanceRatingForm() {
  const [kd, setKd] = useState("1.5");
  const [brawler, setBrawler] = useState("");
  const [comp, setComp] = useState<[string, string, string]>(["", "", ""]);
  const [opponentComp, setOpponentComp] = useState<[string, string, string]>(["", "", ""]);
  const [gameMode, setGameMode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RatingResult | null>(null);
  const [feedbackStars, setFeedbackStars] = useState<number | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

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
    try {
      const res = await fetch("/api/admin/performance-rating/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ computationId: result.computationId, stars }),
      });
      if (!res.ok) {
        setFeedbackStatus("error");
        return;
      }
      setFeedbackStatus("sent");
    } catch {
      setFeedbackStatus("error");
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
        <select
          value={brawler}
          onChange={(e) => setBrawler(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
        >
          <option value="">Choisir un brawler</option>
          {BRAWLER_NAMES.map((name) => (
            <option key={name} value={name}>
              {name} (priorité {MAP_PRIORITY[name]})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-400">Composition jouée (jusqu'à 3 brawlers)</label>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <select
              key={i}
              value={comp[i]}
              onChange={(e) => {
                const next = [...comp] as [string, string, string];
                next[i] = e.target.value;
                setComp(next);
              }}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
            >
              <option value="">Aucun</option>
              {BRAWLER_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
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
            <select
              key={i}
              value={opponentComp[i]}
              onChange={(e) => {
                const next = [...opponentComp] as [string, string, string];
                next[i] = e.target.value;
                setOpponentComp(next);
              }}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
            >
              <option value="">Aucun</option>
              {BRAWLER_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ))}
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
          </ul>

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
              <p className="text-xs text-green-400 mt-1">Merci, les poids ont été ajustés.</p>
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
