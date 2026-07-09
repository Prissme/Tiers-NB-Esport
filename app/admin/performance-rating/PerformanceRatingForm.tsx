"use client";

import { useMemo, useState } from "react";
import { MAP_PRIORITY } from "../../lib/brawler-priority";

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
};

export default function PerformanceRatingForm() {
  const [kd, setKd] = useState("1.5");
  const [brawler, setBrawler] = useState("");
  const [comp, setComp] = useState<[string, string, string]>(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ note: number; breakdown: Breakdown } | null>(null);

  const canSubmit = useMemo(() => {
    const kdNum = Number(kd);
    return brawler.trim().length > 0 && Number.isFinite(kdNum) && kdNum >= 0;
  }, [kd, brawler]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/performance-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kd: Number(kd),
          brawler,
          comp: comp.filter(Boolean),
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
          </ul>
        </div>
      )}
    </div>
  );
}
