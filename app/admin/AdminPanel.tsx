"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import type {
  LfnAnnouncement,
  LfnData,
  LfnMatch,
  LfnResult,
  LfnStandings,
  LfnTeam,
} from "../lib/types";
import type { SaveState } from "./actions";
import { saveData } from "./actions";

const initialSaveState: SaveState = {};

type AdminPanelProps = {
  initialData: LfnData;
};

const defaultAnnouncement = (): LfnAnnouncement => ({
  title: "",
  date: "",
  content: "",
});

const defaultTeam = (): LfnTeam => ({
  id: "",
  name: "",
  tag: "",
  logoUrl: "",
  division: "D1",
  players: [],
});

const defaultMatch = (): LfnMatch => ({
  id: "",
  date: "",
  time: "",
  division: "D1",
  teamA: "",
  teamB: "",
  bo: 3,
});

const defaultResult = (): LfnResult => ({
  matchId: "",
  scoreA: null,
  scoreB: null,
  reportedAt: "",
});

const defaultStandings = (): LfnStandings => ({
  division: "D1",
  rows: [],
});

export default function AdminPanel({ initialData }: AdminPanelProps) {
  const [data, setData] = useState<LfnData>(initialData);
  const [saveState, saveAction] = useFormState<SaveState, FormData>(
    saveData,
    initialSaveState
  );

  const payload = useMemo(() => JSON.stringify(data), [data]);

  const updateAnnouncement = (index: number, update: Partial<LfnAnnouncement>) => {
    setData((prev) => {
      const next = [...prev.announcements];
      next[index] = { ...next[index], ...update };
      return { ...prev, announcements: next };
    });
  };

  const updateTeam = (index: number, update: Partial<LfnTeam>) => {
    setData((prev) => {
      const next = [...prev.teams];
      next[index] = { ...next[index], ...update };
      return { ...prev, teams: next };
    });
  };

  const updateMatch = (index: number, update: Partial<LfnMatch>) => {
    setData((prev) => {
      const next = [...prev.matches];
      next[index] = { ...next[index], ...update };
      return { ...prev, matches: next };
    });
  };

  const updateResult = (index: number, update: Partial<LfnResult>) => {
    setData((prev) => {
      const next = [...prev.results];
      next[index] = { ...next[index], ...update };
      return { ...prev, results: next };
    });
  };

  const updateStandings = (index: number, update: Partial<LfnStandings>) => {
    setData((prev) => {
      const next = [...prev.standings];
      next[index] = { ...next[index], ...update };
      return { ...prev, standings: next };
    });
  };

  return (
    <form action={saveAction} className="space-y-10">
      <input type="hidden" name="payload" value={payload} />

      <section className="section-card space-y-4">
        <h2 className="text-lg font-semibold text-white">Saison</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            Nom
            <input
              value={data.season.name}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  season: { ...prev.season, name: event.target.value },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            Statut
            <select
              value={data.season.status}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  season: {
                    ...prev.season,
                    status: event.target.value as LfnData["season"]["status"],
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="">À annoncer</option>
              <option value="inscriptions">Inscriptions en cours</option>
              <option value="en_cours">En cours</option>
              <option value="terminee">Terminée</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Deadline
            <input
              value={data.season.deadline}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  season: { ...prev.season, deadline: event.target.value },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              placeholder="2025-12-29T15:00:00+01:00"
            />
          </label>
          <label className="text-sm text-slate-300">
            Timezone
            <input
              value={data.season.timezone}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  season: { ...prev.season, timezone: event.target.value },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              placeholder="Europe/Brussels"
            />
          </label>
        </div>
      </section>

      <section className="section-card space-y-4">
        <h2 className="text-lg font-semibold text-white">Liens</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            Discord
            <input
              value={data.links.discord}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  links: { ...prev.links, discord: event.target.value },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
      </section>

      <section className="section-card space-y-4">
        <h2 className="text-lg font-semibold text-white">Format</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            D1 - Nombre d'équipes
            <input
              type="number"
              value={data.format.d1.teams}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  format: {
                    ...prev.format,
                    d1: { ...prev.format.d1, teams: Number(event.target.value) },
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            D1 - BO
            <input
              type="number"
              value={data.format.d1.bo}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  format: {
                    ...prev.format,
                    d1: { ...prev.format.d1, bo: Number(event.target.value) },
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            D1 - Fearless Draft
            <select
              value={data.format.d1.fearlessDraft ? "oui" : "non"}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  format: {
                    ...prev.format,
                    d1: {
                      ...prev.format.d1,
                      fearlessDraft: event.target.value === "oui",
                    },
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            D1 - Matchs par jour
            <input
              type="number"
              value={data.format.d1.matchesPerDay}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  format: {
                    ...prev.format,
                    d1: { ...prev.format.d1, matchesPerDay: Number(event.target.value) },
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            D2 - Nombre d'équipes
            <input
              type="number"
              value={data.format.d2.teams}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  format: {
                    ...prev.format,
                    d2: { ...prev.format.d2, teams: Number(event.target.value) },
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            D2 - BO
            <input
              type="number"
              value={data.format.d2.bo}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  format: {
                    ...prev.format,
                    d2: { ...prev.format.d2, bo: Number(event.target.value) },
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            D2 - Matchs par jour
            <input
              type="number"
              value={data.format.d2.matchesPerDay}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  format: {
                    ...prev.format,
                    d2: { ...prev.format.d2, matchesPerDay: Number(event.target.value) },
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-slate-300 md:col-span-2">
            Horaires (séparés par des virgules)
            <input
              value={data.format.times.join(", ")}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  format: {
                    ...prev.format,
                    times: event.target.value
                      .split(",")
                      .map((time) => time.trim())
                      .filter(Boolean),
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
      </section>

      <section className="section-card space-y-4">
        <h2 className="text-lg font-semibold text-white">Règlement</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            Départage
            <input
              value={data.rules.tiebreak}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  rules: { ...prev.rules, tiebreak: event.target.value },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            Roster - Titulaires
            <input
              type="number"
              value={data.rules.roster.starters}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  rules: {
                    ...prev.rules,
                    roster: {
                      ...prev.rules.roster,
                      starters: Number(event.target.value),
                    },
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            Roster - Subs requis
            <input
              type="number"
              value={data.rules.roster.subsRequired}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  rules: {
                    ...prev.rules,
                    roster: {
                      ...prev.rules.roster,
                      subsRequired: Number(event.target.value),
                    },
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            Coach optionnel
            <select
              value={data.rules.roster.coachOptional ? "oui" : "non"}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  rules: {
                    ...prev.rules,
                    roster: {
                      ...prev.rules.roster,
                      coachOptional: event.target.value === "oui",
                    },
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Retard 15 min
            <input
              value={data.rules.lateness["15min"]}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  rules: {
                    ...prev.rules,
                    lateness: { ...prev.rules.lateness, "15min": event.target.value },
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-slate-300">
            Retard 20 min
            <input
              value={data.rules.lateness["20min"]}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  rules: {
                    ...prev.rules,
                    lateness: { ...prev.rules.lateness, "20min": event.target.value },
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
      </section>

      <section className="section-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Annonces</h2>
          <button
            type="button"
            onClick={() =>
              setData((prev) => ({
                ...prev,
                announcements: [...prev.announcements, defaultAnnouncement()],
              }))
            }
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
          >
            Ajouter
          </button>
        </div>
        <div className="space-y-4">
          {data.announcements.map((announcement, index) => (
            <div key={`announcement-${index}`} className="rounded-xl border border-white/10 p-4">
              <div className="flex justify-between gap-2">
                <p className="text-sm text-slate-300">Annonce #{index + 1}</p>
                <button
                  type="button"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      announcements: prev.announcements.filter((_, idx) => idx !== index),
                    }))
                  }
                  className="text-xs text-rose-300"
                >
                  Supprimer
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input
                  value={announcement.title}
                  onChange={(event) => updateAnnouncement(index, { title: event.target.value })}
                  placeholder="Titre"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <input
                  value={announcement.date}
                  onChange={(event) => updateAnnouncement(index, { date: event.target.value })}
                  placeholder="Date"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <input
                  value={announcement.content}
                  onChange={(event) => updateAnnouncement(index, { content: event.target.value })}
                  placeholder="Contenu"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white md:col-span-3"
                />
              </div>
            </div>
          ))}
          {!data.announcements.length ? (
            <p className="text-sm text-slate-400">Aucune annonce pour le moment.</p>
          ) : null}
        </div>
      </section>

      <section className="section-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Équipes</h2>
          <button
            type="button"
            onClick={() =>
              setData((prev) => ({
                ...prev,
                teams: [...prev.teams, defaultTeam()],
              }))
            }
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
          >
            Ajouter
          </button>
        </div>
        <div className="space-y-4">
          {data.teams.map((team, index) => (
            <div key={`team-${index}`} className="rounded-xl border border-white/10 p-4">
              <div className="flex justify-between gap-2">
                <p className="text-sm text-slate-300">Équipe #{index + 1}</p>
                <button
                  type="button"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      teams: prev.teams.filter((_, idx) => idx !== index),
                    }))
                  }
                  className="text-xs text-rose-300"
                >
                  Supprimer
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input
                  value={team.id}
                  onChange={(event) => updateTeam(index, { id: event.target.value })}
                  placeholder="ID"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <input
                  value={team.name}
                  onChange={(event) => updateTeam(index, { name: event.target.value })}
                  placeholder="Nom"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <input
                  value={team.tag}
                  onChange={(event) => updateTeam(index, { tag: event.target.value })}
                  placeholder="Tag"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <input
                  value={team.logoUrl}
                  onChange={(event) => updateTeam(index, { logoUrl: event.target.value })}
                  placeholder="Logo URL"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white md:col-span-2"
                />
                <select
                  value={team.division}
                  onChange={(event) => updateTeam(index, { division: event.target.value as LfnTeam["division"] })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                >
                  <option value="D1">D1</option>
                  <option value="D2">D2</option>
                </select>
                <input
                  value={team.players.join(", ")}
                  onChange={(event) =>
                    updateTeam(index, {
                      players: event.target.value
                        .split(",")
                        .map((player) => player.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Joueurs (séparés par virgule)"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white md:col-span-3"
                />
              </div>
            </div>
          ))}
          {!data.teams.length ? (
            <p className="text-sm text-slate-400">Aucune équipe enregistrée.</p>
          ) : null}
        </div>
      </section>

      <section className="section-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Calendrier</h2>
          <button
            type="button"
            onClick={() =>
              setData((prev) => ({
                ...prev,
                matches: [...prev.matches, defaultMatch()],
              }))
            }
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
          >
            Ajouter
          </button>
        </div>
        <div className="space-y-4">
          {data.matches.map((match, index) => (
            <div key={`match-${index}`} className="rounded-xl border border-white/10 p-4">
              <div className="flex justify-between gap-2">
                <p className="text-sm text-slate-300">Match #{index + 1}</p>
                <button
                  type="button"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      matches: prev.matches.filter((_, idx) => idx !== index),
                    }))
                  }
                  className="text-xs text-rose-300"
                >
                  Supprimer
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <input
                  value={match.id}
                  onChange={(event) => updateMatch(index, { id: event.target.value })}
                  placeholder="ID"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <input
                  value={match.date}
                  onChange={(event) => updateMatch(index, { date: event.target.value })}
                  placeholder="Date"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <input
                  value={match.time}
                  onChange={(event) => updateMatch(index, { time: event.target.value })}
                  placeholder="Heure"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <select
                  value={match.division}
                  onChange={(event) => updateMatch(index, { division: event.target.value as LfnMatch["division"] })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                >
                  <option value="D1">D1</option>
                  <option value="D2">D2</option>
                </select>
                <input
                  value={match.teamA}
                  onChange={(event) => updateMatch(index, { teamA: event.target.value })}
                  placeholder="Équipe A"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <input
                  value={match.teamB}
                  onChange={(event) => updateMatch(index, { teamB: event.target.value })}
                  placeholder="Équipe B"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <input
                  type="number"
                  value={match.bo}
                  onChange={(event) => updateMatch(index, { bo: Number(event.target.value) })}
                  placeholder="BO"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          ))}
          {!data.matches.length ? (
            <p className="text-sm text-slate-400">Aucun match planifié.</p>
          ) : null}
        </div>
      </section>

      <section className="section-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Résultats</h2>
          <button
            type="button"
            onClick={() =>
              setData((prev) => ({
                ...prev,
                results: [...prev.results, defaultResult()],
              }))
            }
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
          >
            Ajouter
          </button>
        </div>
        <div className="space-y-4">
          {data.results.map((result, index) => (
            <div key={`result-${index}`} className="rounded-xl border border-white/10 p-4">
              <div className="flex justify-between gap-2">
                <p className="text-sm text-slate-300">Résultat #{index + 1}</p>
                <button
                  type="button"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      results: prev.results.filter((_, idx) => idx !== index),
                    }))
                  }
                  className="text-xs text-rose-300"
                >
                  Supprimer
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <input
                  value={result.matchId}
                  onChange={(event) => updateResult(index, { matchId: event.target.value })}
                  placeholder="Match ID"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <input
                  type="number"
                  value={result.scoreA ?? ""}
                  onChange={(event) =>
                    updateResult(index, {
                      scoreA: event.target.value === "" ? null : Number(event.target.value),
                    })
                  }
                  placeholder="Score A"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <input
                  type="number"
                  value={result.scoreB ?? ""}
                  onChange={(event) =>
                    updateResult(index, {
                      scoreB: event.target.value === "" ? null : Number(event.target.value),
                    })
                  }
                  placeholder="Score B"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
                <input
                  value={result.reportedAt}
                  onChange={(event) => updateResult(index, { reportedAt: event.target.value })}
                  placeholder="Reporté le (ISO)"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          ))}
          {!data.results.length ? (
            <p className="text-sm text-slate-400">Aucun résultat enregistré.</p>
          ) : null}
        </div>
      </section>

      <section className="section-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Classement</h2>
          <button
            type="button"
            onClick={() =>
              setData((prev) => ({
                ...prev,
                standings: [...prev.standings, defaultStandings()],
              }))
            }
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
          >
            Ajouter
          </button>
        </div>
        <div className="space-y-4">
          {data.standings.map((standing, index) => (
            <div key={`standing-${index}`} className="rounded-xl border border-white/10 p-4">
              <div className="flex justify-between gap-2">
                <p className="text-sm text-slate-300">Division #{index + 1}</p>
                <button
                  type="button"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      standings: prev.standings.filter((_, idx) => idx !== index),
                    }))
                  }
                  className="text-xs text-rose-300"
                >
                  Supprimer
                </button>
              </div>
              <div className="mt-3 space-y-3">
                <select
                  value={standing.division}
                  onChange={(event) =>
                    updateStandings(index, {
                      division: event.target.value as LfnStandings["division"],
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                >
                  <option value="D1">D1</option>
                  <option value="D2">D2</option>
                </select>
                <div className="space-y-3">
                  {standing.rows.map((row, rowIndex) => (
                    <div key={`standing-row-${rowIndex}`} className="grid gap-3 md:grid-cols-5">
                      <input
                        value={row.teamId}
                        onChange={(event) => {
                          const rows = [...standing.rows];
                          rows[rowIndex] = { ...rows[rowIndex], teamId: event.target.value };
                          updateStandings(index, { rows });
                        }}
                        placeholder="Team ID"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      />
                      <input
                        type="number"
                        value={row.wins}
                        onChange={(event) => {
                          const rows = [...standing.rows];
                          rows[rowIndex] = { ...rows[rowIndex], wins: Number(event.target.value) };
                          updateStandings(index, { rows });
                        }}
                        placeholder="V"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      />
                      <input
                        type="number"
                        value={row.losses}
                        onChange={(event) => {
                          const rows = [...standing.rows];
                          rows[rowIndex] = { ...rows[rowIndex], losses: Number(event.target.value) };
                          updateStandings(index, { rows });
                        }}
                        placeholder="D"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      />
                      <input
                        type="number"
                        value={row.setsWon}
                        onChange={(event) => {
                          const rows = [...standing.rows];
                          rows[rowIndex] = { ...rows[rowIndex], setsWon: Number(event.target.value) };
                          updateStandings(index, { rows });
                        }}
                        placeholder="Sets +"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      />
                      <input
                        type="number"
                        value={row.setsLost}
                        onChange={(event) => {
                          const rows = [...standing.rows];
                          rows[rowIndex] = { ...rows[rowIndex], setsLost: Number(event.target.value) };
                          updateStandings(index, { rows });
                        }}
                        placeholder="Sets -"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const rows = standing.rows.filter((_, idx) => idx !== rowIndex);
                          updateStandings(index, { rows });
                        }}
                        className="text-xs text-rose-300"
                      >
                        Supprimer la ligne
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateStandings(index, {
                        rows: [
                          ...standing.rows,
                          { teamId: "", wins: 0, losses: 0, setsWon: 0, setsLost: 0 },
                        ],
                      })
                    }
                    className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                  >
                    Ajouter une ligne
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!data.standings.length ? (
            <p className="text-sm text-slate-400">Aucun classement enregistré.</p>
          ) : null}
        </div>
      </section>

      <div className="flex flex-col gap-3">
        {saveState?.error ? (
          <p className="text-sm text-rose-300">{saveState.error}</p>
        ) : null}
        {saveState?.persisted !== undefined ? (
          <p className="text-sm text-emerald-300">
            {saveState.persisted
              ? "Données sauvegardées."
              : saveState.message || "Sauvegarde en mémoire uniquement."}
          </p>
        ) : null}
        <button
          type="submit"
          className="inline-flex w-fit items-center justify-center rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
        >
          Enregistrer les modifications
        </button>
      </div>
    </form>
  );
}
