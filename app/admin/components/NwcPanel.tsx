"use client";

import { useEffect, useState } from "react";
import {
  announceMatches,
  announceStandings,
  curMatches,
  emptyState,
  nameOf,
  nextRoundBlocked,
  phase2Blocked,
  qualStatus,
  sortTeams,
  tagFor,
  TOP,
  type NwcState,
} from "../../../src/lib/nwc/swiss";

const TEST_NAMES = Array.from({ length: 16 }, (_, i) => `Équipe ${i + 1}`).join("\n");

const btn =
  "surface-pill surface-pill--active px-3 py-2 text-xs font-semibold text-black disabled:opacity-40";
const ghostBtn = "surface-pill px-3 py-2 text-xs font-semibold text-white/80 disabled:opacity-40";
const label = "block text-xs uppercase tracking-[0.25em] text-white/50 mb-1";

export default function NwcPanel() {
  const [state, setState] = useState<NwcState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [namesText, setNamesText] = useState("");
  const [manualText, setManualText] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/admin/nwc", { cache: "no-store" });
      const body = (await res.json()) as { state?: NwcState; error?: string };
      if (!res.ok || !body.state) throw new Error(body.error ?? "Chargement impossible.");
      setState(body.state);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setState(emptyState());
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (payload: Record<string, unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/nwc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { state?: NwcState; error?: string };
      if (!res.ok || !body.state) {
        setError(body.error ?? "Action impossible.");
        return false;
      }
      setState(body.state);
      return true;
    } catch {
      setError("Erreur réseau.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const fillManualFromRound = () => {
    if (!state) return;
    setManualText(
      curMatches(state)
        .map((m) => (m.b !== null ? `${nameOf(state, m.a)} vs ${nameOf(state, m.b)}` : `${nameOf(state, m.a)} bye`))
        .join("\n")
    );
  };

  const showAnnouncement = (build: (s: NwcState) => string) => {
    if (!state) return;
    try {
      setAnnouncement(build(state));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Annonce impossible.");
    }
  };

  const copyAnnouncement = async () => {
    if (!announcement) return;
    try {
      await navigator.clipboard.writeText(announcement);
    } catch {
      setError("Copie automatique impossible : sélectionne le texte et fais Ctrl+C.");
    }
  };

  if (!state) {
    return <section className="secondary-section surface-card--soft text-sm text-white/60">Chargement…</section>;
  }

  const hasTournament = state.teams.length > 0;

  if (!hasTournament) {
    return (
      <section className="secondary-section surface-card--soft space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-utility">NWC</p>
          <h3 className="text-lg font-semibold text-white">Créer le tournoi Swiss</h3>
          <p className="mt-1 text-xs text-white/50">Une équipe par ligne. Cela remplace tout bracket existant.</p>
        </div>
        {error ? <div className="surface-alert surface-alert--error">{error}</div> : null}
        <textarea
          value={namesText}
          onChange={(e) => setNamesText(e.target.value)}
          rows={8}
          placeholder={"Team Alpha\nTeam Beta\nTeam Gamma\nTeam Delta"}
          className="surface-textarea w-full"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} className={btn} onClick={() => act({ action: "create", names: namesText })}>
            Créer le tournoi
          </button>
          <button type="button" className={ghostBtn} onClick={() => setNamesText(TEST_NAMES)}>
            16 équipes de test
          </button>
        </div>
      </section>
    );
  }

  const cur = curMatches(state);
  const nextBlock = nextRoundBlocked(state);
  const p2Block = phase2Blocked(state);
  const standings = sortTeams(state);
  const qualCount = state.teams.filter((t) => qualStatus(t) === "Q").length;

  return (
    <section className="secondary-section space-y-6">
      <div className="surface-card--soft flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-utility">NWC · Swiss Stage</p>
          <h3 className="text-lg font-semibold text-white">
            Phase {state.phase} · Round {state.round} · {qualCount}/{TOP} qualifiés
          </h3>
          <p className="mt-1 text-xs text-white/50">
            Les modifications sont publiées sur /nwc dès l'enregistrement (rafraîchissement auto côté public).
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          className={ghostBtn}
          onClick={() => {
            if (confirm("Réinitialiser le tournoi NWC ? Toutes les données du bracket seront effacées.")) {
              setNamesText("");
              act({ action: "reset" });
            }
          }}
        >
          Réinitialiser
        </button>
      </div>

      {error ? <div className="surface-alert surface-alert--error">{error}</div> : null}

      {/* Matchs du round courant */}
      <div className="surface-card--soft space-y-3">
        <h4 className="text-xs uppercase tracking-[0.25em] text-white/50">Matchs du round courant</h4>
        {cur.length === 0 ? (
          <p className="text-sm text-white/50">Aucun match. Génère le round suivant.</p>
        ) : (
          cur.map((m, i) => (
            <div
              key={`${state.phase}-${state.round}-${i}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-white/5 px-4 py-3"
            >
              {m.b === null ? (
                <p className="text-sm text-white">
                  <span className="text-white/40">Match {i + 1} · </span>
                  {nameOf(state, m.a)} <span className="text-white/50">(bye, victoire automatique)</span>
                </p>
              ) : (
                <>
                  <p className="text-sm text-white">
                    <span className="text-white/40">Match {i + 1} · </span>
                    <span className={m.w === m.a ? "font-semibold text-cyan-300" : ""}>
                      {nameOf(state, m.a)} ({m.ra.join("-")})
                    </span>
                    <span className="mx-2 text-white/40">vs</span>
                    <span className={m.w === m.b ? "font-semibold text-cyan-300" : ""}>
                      {nameOf(state, m.b)} ({m.rb?.join("-")})
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {m.done ? (
                      <button type="button" disabled={busy} className={ghostBtn} onClick={() => act({ action: "undoWinner", index: i })}>
                        Annuler le résultat
                      </button>
                    ) : (
                      <>
                        <button type="button" disabled={busy} className={btn} onClick={() => act({ action: "setWinner", index: i, which: 0 })}>
                          Victoire {nameOf(state, m.a)}
                        </button>
                        <button type="button" disabled={busy} className={btn} onClick={() => act({ action: "setWinner", index: i, which: 1 })}>
                          Victoire {nameOf(state, m.b)}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button type="button" disabled={busy || nextBlock !== null} className={btn} onClick={() => act({ action: "nextRound" })}>
            Générer le round suivant
          </button>
          {state.phase === 1 ? (
            <button type="button" disabled={busy || p2Block !== null} className={btn} onClick={() => act({ action: "startPhase2" })}>
              Lancer la phase 2 (Swiss top {TOP})
            </button>
          ) : null}
          {nextBlock ? <span className="text-xs text-white/50">{nextBlock}</span> : null}
          {state.phase === 1 && p2Block ? <span className="text-xs text-white/40">{p2Block}</span> : null}
        </div>
      </div>

      {/* Classement */}
      <div className="surface-card--soft">
        <h4 className="mb-3 text-xs uppercase tracking-[0.25em] text-white/50">Classement</h4>
        <div className="overflow-x-auto">
          <table className="surface-table w-full text-sm text-white/80">
            <thead className="surface-table__header text-xs uppercase text-white/40">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Équipe</th>
                <th className="px-3 py-2 text-left">W-L</th>
                <th className="px-3 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((t, i) => (
                <tr key={t.id} className="surface-table__row">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 text-white/90">{t.name}</td>
                  <td className="px-3 py-2">
                    {t.w}-{t.l}
                  </td>
                  <td className="px-3 py-2 text-xs uppercase tracking-wider">{tagFor(state, t).label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matchups manuels */}
      <details className="surface-card--soft">
        <summary className="cursor-pointer text-xs uppercase tracking-[0.25em] text-white/60">
          Matchups manuels
        </summary>
        <div className="mt-4 space-y-3">
          <p className="text-xs text-white/50">
            Une ligne par match : <code>Équipe A vs Équipe B</code>, ou <code>Équipe bye</code>. Remplace les matchs du round
            courant (les scores déjà saisis dans ce round sont effacés).
          </p>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={6}
            placeholder={"Team Alpha vs Team Beta\nTeam Gamma bye"}
            className="surface-textarea w-full"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ghostBtn} disabled={cur.length === 0} onClick={fillManualFromRound}>
              Remplir avec le round actuel
            </button>
            <button
              type="button"
              disabled={busy || state.round < 1}
              className={btn}
              onClick={() => {
                if (confirm("Remplacer les matchs du round actuel ?")) act({ action: "applyManual", text: manualText });
              }}
            >
              Appliquer ces matchups
            </button>
          </div>
        </div>
      </details>

      {/* Annonces Discord */}
      <div className="surface-card--soft space-y-3">
        <h4 className="text-xs uppercase tracking-[0.25em] text-white/50">Annonces Discord</h4>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => showAnnouncement(announceMatches)}>
            Annonce des matchs
          </button>
          <button type="button" className={btn} onClick={() => showAnnouncement(announceStandings)}>
            Annonce du classement
          </button>
          <button type="button" className={ghostBtn} disabled={!announcement} onClick={copyAnnouncement}>
            Copier
          </button>
        </div>
        <textarea
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          rows={10}
          placeholder="Clique sur une annonce pour la générer ici"
          className="surface-textarea w-full"
        />
        <p className={label}>Texte généré à partir du bracket actuel, modifiable avant copie.</p>
      </div>
    </section>
  );
}
