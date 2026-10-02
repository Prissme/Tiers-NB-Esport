"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES } from "./CountrySearch";
import {
  MAX_WINNERS,
  type Tournament,
  type TournamentStatus,
  type TournamentWinner,
} from "../../../src/lib/tournaments";

const STATUS_LABELS: Record<TournamentStatus, string> = {
  upcoming: "À venir",
  live: "En cours",
  finished: "Terminé",
};

const STATUS_ORDER: TournamentStatus[] = ["upcoming", "live", "finished"];

type FormState = {
  id?: string;
  name: string;
  bannerUrl: string;
  status: TournamentStatus;
  startsAt: string;
  durationHours: string;
  teamsRegistered: string;
  teamsMax: string;
  cashprize: string;
  tierPoints: boolean;
  winners: TournamentWinner[];
};

const emptyForm: FormState = {
  name: "",
  bannerUrl: "",
  status: "upcoming",
  startsAt: "",
  durationHours: "",
  teamsRegistered: "0",
  teamsMax: "16",
  cashprize: "0",
  tierPoints: false,
  winners: [],
};

const pad = (value: number) => String(value).padStart(2, "0");

// ISO (UTC) -> valeur d'un <input type="datetime-local"> en heure locale
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "Date à définir";
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
};

const toForm = (tournament: Tournament): FormState => ({
  id: tournament.id,
  name: tournament.name,
  bannerUrl: tournament.bannerUrl ?? "",
  status: tournament.status,
  startsAt: toLocalInput(tournament.startsAt),
  durationHours: tournament.durationHours === null ? "" : String(tournament.durationHours),
  teamsRegistered: String(tournament.teamsRegistered),
  teamsMax: String(tournament.teamsMax),
  cashprize: String(tournament.cashprize),
  tierPoints: tournament.tierPoints,
  winners: tournament.winners,
});

const toFlag = (code: string) =>
  /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...Array.from(code).map((char) => 127397 + char.charCodeAt(0)))
    : "🏳️";

const labelClass = "mb-1 block text-xs uppercase tracking-[0.25em] text-white/50";

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function TournamentsPanel() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const response = await fetch("/api/admin/tournaments", { cache: "no-store" });
      if (!response.ok) {
        setMessage({ type: "error", text: await readError(response, "Impossible de charger les tournois.") });
        return;
      }
      const body = (await response.json()) as { tournaments?: Tournament[] };
      setTournaments(body.tournaments ?? []);
    } catch {
      setMessage({ type: "error", text: "Impossible de charger les tournois." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (patch: Partial<FormState>) => setForm((current) => (current ? { ...current, ...patch } : current));

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Le nom du tournoi est obligatoire." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const payload = {
      name: form.name,
      bannerUrl: form.bannerUrl,
      status: form.status,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      durationHours: form.durationHours === "" ? null : Number(form.durationHours),
      teamsRegistered: Number(form.teamsRegistered || 0),
      teamsMax: Number(form.teamsMax || 0),
      cashprize: Number(form.cashprize || 0),
      tierPoints: form.tierPoints,
      winners: form.status === "finished" ? form.winners : [],
    };
    try {
      const response = await fetch(form.id ? `/api/admin/tournaments/${form.id}` : "/api/admin/tournaments", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setMessage({ type: "error", text: await readError(response, "Enregistrement impossible.") });
        return;
      }
      await load();
      setForm(null);
      setMessage({ type: "success", text: form.id ? "Tournoi mis à jour." : "Tournoi créé." });
    } catch {
      setMessage({ type: "error", text: "Enregistrement impossible." });
    } finally {
      setSaving(false);
    }
  };

  const quickStatus = async (tournament: Tournament, status: TournamentStatus) => {
    setMessage(null);
    const response = await fetch(`/api/admin/tournaments/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setMessage({ type: "error", text: await readError(response, "Changement de statut impossible.") });
      return;
    }
    await load();
  };

  const remove = async (tournament: Tournament) => {
    if (!window.confirm(`Supprimer le tournoi « ${tournament.name} » ?`)) return;
    setMessage(null);
    const response = await fetch(`/api/admin/tournaments/${tournament.id}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage({ type: "error", text: await readError(response, "Suppression impossible.") });
      return;
    }
    await load();
    setMessage({ type: "success", text: "Tournoi supprimé." });
  };

  const uploadBanner = async (file: File) => {
    setUploading(true);
    setMessage(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/admin/tournaments/banner", { method: "POST", body: data });
      if (!response.ok) {
        setMessage({ type: "error", text: await readError(response, "Upload impossible.") });
        return;
      }
      const body = (await response.json()) as { url?: string };
      if (body.url) update({ bannerUrl: body.url });
    } catch {
      setMessage({ type: "error", text: "Upload impossible." });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const setWinner = (index: number, patch: Partial<TournamentWinner>) => {
    if (!form) return;
    update({ winners: form.winners.map((winner, i) => (i === index ? { ...winner, ...patch } : winner)) });
  };

  return (
    <section className="surface-card--soft space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-utility">Tournois</p>
          <h3 className="text-lg font-semibold text-white">Tournois affichés sur le site</h3>
        </div>
        {!form ? (
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setForm({ ...emptyForm });
            }}
            className="surface-pill surface-pill--active px-4 py-2 text-sm font-semibold text-black"
          >
            + Nouveau tournoi
          </button>
        ) : null}
      </div>

      {message ? (
        <div className={`surface-alert ${message.type === "error" ? "surface-alert--error" : "surface-alert--success"}`}>
          {message.text}
        </div>
      ) : null}

      {form ? (
        <div className="space-y-5 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-semibold text-white">{form.id ? "Modifier le tournoi" : "Nouveau tournoi"}</p>

          <div>
            <label className={labelClass}>Nom du tournoi</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => update({ name: event.target.value })}
              placeholder="Ex : LFN Open #12"
              className="surface-input"
            />
          </div>

          <div>
            <label className={labelClass}>Statut</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => update({ status })}
                  className={`surface-tab ${form.status === status ? "surface-tab--active" : ""}`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Date et heure (heure de Paris)</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => update({ startsAt: event.target.value })}
                className="surface-input"
              />
            </div>
            <div>
              <label className={labelClass}>Durée estimée (heures)</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={form.durationHours}
                onChange={(event) => update({ durationHours: event.target.value })}
                placeholder="Ex : 3"
                className="surface-input"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className={labelClass}>Équipes inscrites</label>
              <input
                type="number"
                min={0}
                value={form.teamsRegistered}
                onChange={(event) => update({ teamsRegistered: event.target.value })}
                className="surface-input"
              />
            </div>
            <div>
              <label className={labelClass}>Équipes max</label>
              <input
                type="number"
                min={0}
                value={form.teamsMax}
                onChange={(event) => update({ teamsMax: event.target.value })}
                className="surface-input"
              />
            </div>
            <div>
              <label className={labelClass}>Cashprize (€)</label>
              <input
                type="number"
                min={0}
                value={form.cashprize}
                onChange={(event) => update({ cashprize: event.target.value })}
                className="surface-input"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm text-white">
            <input
              type="checkbox"
              checked={form.tierPoints}
              onChange={(event) => update({ tierPoints: event.target.checked })}
              className="h-4 w-4 accent-[#c9b26a]"
            />
            Points de tier activés
          </label>

          <div>
            <label className={labelClass}>Bannière</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadBanner(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="surface-pill px-4 py-2 text-sm disabled:opacity-50"
              >
                {uploading ? "Envoi..." : "Choisir une image"}
              </button>
              <input
                type="text"
                value={form.bannerUrl}
                onChange={(event) => update({ bannerUrl: event.target.value })}
                placeholder="…ou colle l'URL d'une image"
                className="surface-input min-w-[220px] flex-1"
              />
            </div>
            {form.bannerUrl ? (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.bannerUrl}
                  alt="Aperçu de la bannière"
                  className="h-24 w-auto max-w-full rounded-lg border border-white/10 object-cover"
                />
                <button
                  type="button"
                  onClick={() => update({ bannerUrl: "" })}
                  className="text-xs text-white/50 underline hover:text-white"
                >
                  Retirer
                </button>
              </div>
            ) : null}
          </div>

          {form.status === "finished" ? (
            <div>
              <label className={labelClass}>Gagnants ({form.winners.length}/{MAX_WINNERS}) — membres de l'équipe gagnante</label>
              <div className="space-y-2">
                {form.winners.map((winner, index) => (
                  <div key={index} className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-2">
                    <span className="text-center text-sm font-semibold text-[#f2d184]">•</span>
                    <input
                      type="text"
                      value={winner.name}
                      onChange={(event) => setWinner(index, { name: event.target.value })}
                      placeholder="Pseudo"
                      maxLength={40}
                      className="surface-input"
                    />
                    <select
                      value={winner.country}
                      onChange={(event) => setWinner(index, { country: event.target.value })}
                      className="surface-input w-44"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {toFlag(country.code)} {country.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => update({ winners: form.winners.filter((_, i) => i !== index) })}
                      className="px-2 text-white/50 hover:text-white"
                      aria-label="Retirer ce gagnant"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {form.winners.length < MAX_WINNERS ? (
                <button
                  type="button"
                  onClick={() => update({ winners: [...form.winners, { name: "", country: "FR" }] })}
                  className="surface-pill mt-3 px-4 py-2 text-sm"
                >
                  + Ajouter un gagnant
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || uploading}
              className="surface-pill surface-pill--active px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setMessage(null);
              }}
              className="surface-pill px-5 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/60">Chargement...</p>
      ) : tournaments.length === 0 ? (
        <p className="text-sm text-white/60">Aucun tournoi pour l'instant. Clique sur « Nouveau tournoi ».</p>
      ) : (
        <div className="space-y-2">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="flex flex-wrap items-center gap-3 rounded-[10px] bg-white/5 px-4 py-3"
            >
              {tournament.bannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tournament.bannerUrl}
                  alt=""
                  className="h-10 w-16 shrink-0 rounded-md border border-white/10 object-cover"
                />
              ) : (
                <div className="h-10 w-16 shrink-0 rounded-md border border-white/10 bg-white/5" />
              )}
              <div className="min-w-[160px] flex-1">
                <p className="text-sm font-semibold text-white">{tournament.name}</p>
                <p className="text-xs text-utility">
                  {formatDate(tournament.startsAt)} • {tournament.teamsRegistered}/{tournament.teamsMax} équipes
                </p>
              </div>
              <select
                value={tournament.status}
                onChange={(event) => quickStatus(tournament, event.target.value as TournamentStatus)}
                className="surface-input surface-input--compact w-auto"
                aria-label="Changer le statut"
              >
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setForm(toForm(tournament));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="surface-pill px-3 py-1.5 text-xs"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => remove(tournament)}
                className="px-2 text-xs text-white/50 hover:text-red-300"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
