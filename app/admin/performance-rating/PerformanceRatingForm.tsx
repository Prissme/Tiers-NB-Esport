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
  victory: boolean | null;
};

type RatingResult = { note: number; computationId: string | null; breakdown: Breakdown };

type WeightChange = { key: keyof RatingWeights; before: number; after: number };

// Feedback possible après calcul : up / down / perfect (note correcte)
type FeedbackKind = "up" | "down" | "perfect";

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
  const [mapName, setMapName] = useState("");
  const [starPlayer, setStarPlayer] = useState(false);
  const [victory, setVictory] = useState<boolean | null>(null);
  const [degats, setDegats] = useState("");
  const [soin, setSoin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RatingResult | null>(null);
  const [weightChanges, setWeightChanges] = useState<WeightChange[] | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedbackSent, setFeedbackSent] = useState<FeedbackKind | null>(null);

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

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    setWeightChanges(null);
    setFeedbackStatus("idle");
    setFeedbackSent(null);
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
          victory,
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

  // Feedback directionnel simple (trop basse / trop haute)
  async function submitDirection(direction: "up" | "down") {
    if (!result?.computationId) return;
    setFeedbackSent(direction);
    setFeedbackStatus("sending");
    setWeightChanges(null);
    try {
      const res = await fetch("/api/admin/performance-rating/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          computationId: result.computationId,
          direction,
          strength: "normal",
        }),
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

  // "Note correcte" : envoie up + down en weak simultanément.
  // Les deux effets s'annulent quasi-parfaitement → seule la régularisation L2
  // douce s'applique (légère traction vers les valeurs par défaut, sans bruit
  // directionnel). C'est le signal "ne change rien, tu étais bon".
  async function submitPerfect() {
    if (!result?.computationId) return;
    setFeedbackSent("perfect");
    setFeedbackStatus("sending");
    setWeightChanges(null);
    try {
      await Promise.all([
        fetch("/api/admin/performance-rating/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            computationId: result.computationId,
            direction: "up",
            strength: "weak",
          }),
        }),
        fetch("/api/admin/performance-rating/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            computationId: result.computationId,
            direction: "down",
            strength: "weak",
          }),
        }),
      ]);
      setFeedbackStatus("sent");
      setWeightChanges([]); // aucun delta net visible — c'est voulu
    } catch {
      setFeedbackStatus("error");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Kills / Morts ── */}
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

      {/* ── Brawler joué ── */}
      <div className="space-y-2">
        <label className="text-sm text-neutral-400">Brawler joué</label>
        <BrawlerSearchSelect
          value={brawler}
          onChange={setBrawler}
          placeholder="Rechercher un brawler..."
          showPriority
        />
      </div>

      {/* ── Dégâts / Soin ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-neutral-400">
            Dégâts <span className="text-neutral-600">— inconnu si vide</span>
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={degats}
            onChange={(e) => setDegats(e.target.value)}
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
            onChange={(e) => setSoin(e.target.value)}
            placeholder={degats.trim() !== "" ? `< ${degats}` : "Ex: 3000"}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </div>
      </div>

      {/* ── Composition jouée ── */}
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

      {/* ── Mode de jeu ── */}
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

      {/* ── Nom de la map ── */}
      <div className="space-y-2">
        <label className="text-sm text-neutral-400">
          Nom de la map{" "}
          <span className="text-neutral-600">
            — optionnel, affine les synergies avec les données de cette map précise
          </span>
        </label>
        <input
          type="text"
          value={mapName}
          onChange={(e) => setMapName(e.target.value)}
          placeholder="Ex: Hard Rock Mine"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
      </div>

      {/* ── Composition adverse ── */}
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

      {/* ── Joueur Star ── */}
      <div className="space-y-2">
        <label className="text-sm text-neutral-400">
          Joueur Star ?{" "}
          <span className="text-neutral-600">
            (impact décisif sur l'objectif malgré un K/D faible — ex: hard focus coffre en Braquage)
          </span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStarPlayer(true)}
            className={`rounded-md px-4 py-2 text-sm font-medium border ${
              starPlayer
                ? "bg-yellow-500 text-black border-yellow-500"
                : "border-neutral-700 text-neutral-300"
            }`}
          >
            Oui
          </button>
          <button
            type="button"
            onClick={() => setStarPlayer(false)}
            className={`rounded-md px-4 py-2 text-sm font-medium border ${
              !starPlayer
                ? "bg-neutral-700 text-white border-neutral-700"
                : "border-neutral-700 text-neutral-300"
            }`}
          >
            Non
          </button>
        </div>
      </div>

      {/* ── Résultat du match ── signal primaire pour le learning synergies/counter */}
      <div className="space-y-2">
        <label className="text-sm text-neutral-400">
          Résultat du match{" "}
          <span className="text-neutral-600">
            — signal principal pour affiner les synergies et counters
          </span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setVictory(true)}
            className={`rounded-md px-4 py-2 text-sm font-medium border transition-colors ${
              victory === true
                ? "bg-green-500 text-black border-green-500"
                : "border-neutral-700 text-neutral-300 hover:border-green-700"
            }`}
          >
            🏆 Victoire
          </button>
          <button
            type="button"
            onClick={() => setVictory(false)}
            className={`rounded-md px-4 py-2 text-sm font-medium border transition-colors ${
              victory === false
                ? "bg-red-500 text-white border-red-500"
                : "border-neutral-700 text-neutral-300 hover:border-red-700"
            }`}
          >
            💀 Défaite
          </button>
          {victory !== null && (
            <button
              type="button"
              onClick={() => setVictory(null)}
              className="rounded-md px-3 py-2 text-sm font-medium border border-neutral-700 text-neutral-500 hover:text-neutral-300"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Bouton calcul ── */}
      <button
        type="button"
        disabled={!canSubmit || loading}
        onClick={handleSubmit}
        className="rounded-md bg-white px-4 py-2 font-medium text-black disabled:opacity-50"
      >
        {loading ? "Calcul..." : "Calculer la note"}
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* ── Résultat ── */}
      {result && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4 space-y-3">

          {/* Note + badge victoire/défaite */}
          <div className="flex items-center gap-3">
            <p className="text-3xl font-semibold">{result.note.toFixed(1)}/10</p>
            {result.breakdown.victory === true && (
              <span className="rounded-md bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 text-sm font-medium">
                🏆 Victoire
              </span>
            )}
            {result.breakdown.victory === false && (
              <span className="rounded-md bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 text-sm font-medium">
                💀 Défaite
              </span>
            )}
          </div>

          {/* Détail du breakdown */}
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
                  {result.breakdown.trioDetail.source === "map"
                    ? "données de cette map"
                    : "repli global toutes maps"}
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

          {/* ── Feedback humain ── */}
          <div className="pt-2 border-t border-neutral-800">
            <p className="text-sm text-neutral-400 mb-2">Cette note te semble juste ?</p>

            {/* Trois boutons : ↑ Trop basse — ✅ Note correcte — ↓ Trop haute */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={!result.computationId || feedbackStatus === "sending"}
                onClick={() => submitDirection("up")}
                title="La note était trop basse"
                className="flex items-center gap-1 rounded-md border px-3 py-2 text-sm disabled:opacity-40 transition-colors"
                style={
                  feedbackSent === "up" && feedbackStatus === "sent"
                    ? { borderColor: "#4ade80", color: "#4ade80" }
                    : { borderColor: "#404040", color: "#a3a3a3" }
                }
              >
                ↑ Trop basse
              </button>

              <button
                type="button"
                disabled={!result.computationId || feedbackStatus === "sending"}
                onClick={submitPerfect}
                title="La note est correcte — stabilise les poids"
                className="flex items-center gap-1 rounded-md border px-3 py-2 text-sm disabled:opacity-40 transition-colors"
                style={
                  feedbackSent === "perfect" && feedbackStatus === "sent"
                    ? { borderColor: "#86efac", color: "#86efac", background: "rgba(134,239,172,0.08)" }
                    : { borderColor: "#404040", color: "#a3a3a3" }
                }
              >
                ✅ Note correcte
              </button>

              <button
                type="button"
                disabled={!result.computationId || feedbackStatus === "sending"}
                onClick={() => submitDirection("down")}
                title="La note était trop haute"
                className="flex items-center gap-1 rounded-md border px-3 py-2 text-sm disabled:opacity-40 transition-colors"
                style={
                  feedbackSent === "down" && feedbackStatus === "sent"
                    ? { borderColor: "#f87171", color: "#f87171" }
                    : { borderColor: "#404040", color: "#a3a3a3" }
                }
              >
                ↓ Trop haute
              </button>
            </div>

            {/* Retour visuel selon le feedback envoyé */}
            {feedbackStatus === "sent" && feedbackSent === "perfect" && (
              <p className="text-xs text-green-400 mt-2">
                Note validée — poids stabilisés, aucun ajustement directionnel.
              </p>
            )}

            {feedbackStatus === "sent" && feedbackSent !== "perfect" && weightChanges && (
              <div className="mt-2 rounded-md border border-neutral-800 bg-black/30 p-3">
                <p className="text-xs text-green-400 mb-2">
                  Poids ajustés vers {feedbackSent === "up" ? "le haut" : "le bas"} :
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

            {feedbackStatus === "error" && (
              <p className="text-xs text-red-400 mt-1">Échec de l'enregistrement du feedback.</p>
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
