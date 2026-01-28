"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
  extractRound,
  matchFormSchema,
  toTimestamp,
  type MatchFormValues,
} from "../../../lib/validators";

export type TeamOption = {
  id: string;
  name: string;
  tag?: string | null;
  division?: string | null;
};

type MatchFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  teams: TeamOption[];
  seasonId?: string | null;
  initialValues?: Partial<MatchFormValues> | null;
};

const buildDefaultValues = (
  initialValues?: Partial<MatchFormValues> | null,
  seasonId?: string | null
): MatchFormValues => ({
  id: initialValues?.id,
  day: initialValues?.day ?? 1,
  dayLabel: initialValues?.dayLabel ?? "",
  round: initialValues?.round ?? null,
  matchGroup: initialValues?.matchGroup ?? "Match 1",
  phase: initialValues?.phase ?? "Regular",
  division: initialValues?.division ?? "D1",
  bestOf: initialValues?.bestOf ?? 5,
  status: initialValues?.status ?? "scheduled",
  teamAId: initialValues?.teamAId ?? "",
  teamBId: initialValues?.teamBId ?? "",
  scheduledDate: initialValues?.scheduledDate ?? "",
  scheduledTime: initialValues?.scheduledTime ?? "",
  startDate: initialValues?.startDate ?? "",
  startTime: initialValues?.startTime ?? "",
  playedDate: initialValues?.playedDate ?? "",
  playedTime: initialValues?.playedTime ?? "",
  scoreA: initialValues?.scoreA ?? null,
  scoreB: initialValues?.scoreB ?? null,
  setsA: initialValues?.setsA ?? null,
  setsB: initialValues?.setsB ?? null,
  notes: initialValues?.notes ?? "",
  proofUrl: initialValues?.proofUrl ?? "",
  vodUrl: initialValues?.vodUrl ?? "",
  seasonId: initialValues?.seasonId ?? seasonId ?? null,
});

const splitTimestamp = (value?: string | null) => {
  if (!value) {
    return { date: "", time: "" };
  }
  const [date, time] = value.split("T");
  return { date, time: (time ?? "").slice(0, 5) };
};

export default function MatchFormDialog({
  open,
  onOpenChange,
  onSaved,
  teams,
  seasonId,
  initialValues,
}: MatchFormDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultValues = useMemo(
    () => buildDefaultValues(initialValues, seasonId),
    [initialValues, seasonId]
  );

  const [values, setValues] = useState<MatchFormValues>(defaultValues);

  useEffect(() => {
    const values = buildDefaultValues(initialValues, seasonId);
    if (initialValues?.scheduledDate === undefined && initialValues?.scheduledTime === undefined) {
      const scheduled = splitTimestamp((initialValues as Partial<Record<string, string>>)?.scheduledAt);
      values.scheduledDate = scheduled.date;
      values.scheduledTime = scheduled.time;
    }
    if (initialValues?.startDate === undefined && initialValues?.startTime === undefined) {
      const start = splitTimestamp((initialValues as Partial<Record<string, string>>)?.startTime);
      values.startDate = start.date;
      values.startTime = start.time;
    }
    if (initialValues?.playedDate === undefined && initialValues?.playedTime === undefined) {
      const played = splitTimestamp((initialValues as Partial<Record<string, string>>)?.playedAt);
      values.playedDate = played.date;
      values.playedTime = played.time;
    }
    setValues(values);
  }, [initialValues, seasonId]);

  const updateField = <Key extends keyof MatchFormValues>(field: Key, value: MatchFormValues[Key]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange =
    (field: keyof MatchFormValues, allowNull = false) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      const nextValue = rawValue === "" && allowNull ? null : Number(rawValue);
      if (rawValue === "" && !allowNull) {
        updateField(field, 0 as MatchFormValues[typeof field]);
        return;
      }
      updateField(field, nextValue as MatchFormValues[typeof field]);
    };

  const handleTextChange =
    (field: keyof MatchFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      updateField(field, event.target.value as MatchFormValues[typeof field]);
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = matchFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Validation invalide.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);

    const payload = {
      day: parsed.data.day,
      day_label: parsed.data.dayLabel || null,
      round: extractRound(parsed.data.round ?? null, parsed.data.matchGroup),
      match_group: parsed.data.matchGroup,
      phase: parsed.data.phase,
      division: parsed.data.division,
      best_of: parsed.data.bestOf ?? null,
      status: parsed.data.status,
      team_a_id: parsed.data.teamAId,
      team_b_id: parsed.data.teamBId,
      scheduled_at: toTimestamp(parsed.data.scheduledDate, parsed.data.scheduledTime),
      start_time: toTimestamp(parsed.data.startDate, parsed.data.startTime),
      played_at: toTimestamp(parsed.data.playedDate, parsed.data.playedTime),
      score_a: parsed.data.scoreA ?? null,
      score_b: parsed.data.scoreB ?? null,
      sets_a: parsed.data.setsA ?? null,
      sets_b: parsed.data.setsB ?? null,
      notes: parsed.data.notes || null,
      proof_url: parsed.data.proofUrl || null,
      vod_url: parsed.data.vodUrl || null,
      season_id: parsed.data.seasonId ?? seasonId ?? null,
    };

    const query = parsed.data.id
      ? supabase.from("lfn_matches").update(payload).eq("id", parsed.data.id)
      : supabase.from("lfn_matches").insert(payload);

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="surface-card w-full max-w-4xl bg-slate-950/90 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">LFN Admin</p>
            <h2 className="text-2xl font-semibold text-white">
              {initialValues?.id ? "Modifier le match" : "Créer un match"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="surface-pill px-3 py-1 text-xs text-white/70 hover:text-white"
          >
            Fermer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-white/70">
              Jour
              <input
                type="number"
                value={values.day}
                onChange={handleNumberChange("day")}
                className="surface-input"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Label jour
              <input
                type="text"
                value={values.dayLabel ?? ""}
                onChange={handleTextChange("dayLabel")}
                className="surface-input"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Round (num)
              <input
                type="number"
                value={values.round ?? ""}
                onChange={handleNumberChange("round", true)}
                className="surface-input"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-white/70">
              Match label
              <input
                type="text"
                value={values.matchGroup}
                onChange={handleTextChange("matchGroup")}
                className="surface-input"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Phase
              <input
                type="text"
                value={values.phase}
                onChange={handleTextChange("phase")}
                className="surface-input"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Division
              <input
                type="text"
                value={values.division}
                onChange={handleTextChange("division")}
                className="surface-input"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-white/70">
              Equipe A
              <select
                value={values.teamAId}
                onChange={handleTextChange("teamAId")}
                className="surface-input"
              >
                <option value="">Sélectionner</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Equipe B
              <select
                value={values.teamBId}
                onChange={handleTextChange("teamBId")}
                className="surface-input"
              >
                <option value="">Sélectionner</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-white/70">
              Best of
              <input
                type="number"
                value={values.bestOf ?? ""}
                onChange={handleNumberChange("bestOf", true)}
                className="surface-input"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Status
              <select
                value={values.status}
                onChange={handleTextChange("status")}
                className="surface-input"
              >
                <option value="scheduled">Programmé</option>
                <option value="live">Live</option>
                <option value="completed">Terminé</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Saison
              <input
                type="text"
                value={values.seasonId ?? ""}
                onChange={handleTextChange("seasonId")}
                placeholder={seasonId ?? "UUID"}
                className="surface-input"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="surface-card--flat">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Programmé</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-white/70">
                  Date
                  <input
                    type="date"
                    value={values.scheduledDate ?? ""}
                    onChange={handleTextChange("scheduledDate")}
                    className="surface-input"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Heure
                  <input
                    type="time"
                    value={values.scheduledTime ?? ""}
                    onChange={handleTextChange("scheduledTime")}
                    className="surface-input"
                  />
                </label>
              </div>
            </div>
            <div className="surface-card--flat">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Start time</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-white/70">
                  Date
                  <input
                    type="date"
                    value={values.startDate ?? ""}
                    onChange={handleTextChange("startDate")}
                    className="surface-input"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Heure
                  <input
                    type="time"
                    value={values.startTime ?? ""}
                    onChange={handleTextChange("startTime")}
                    className="surface-input"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="surface-card--flat">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Résultat</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-white/70">
                  Score A
                  <input
                    type="number"
                    value={values.scoreA ?? ""}
                    onChange={handleNumberChange("scoreA", true)}
                    className="surface-input"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Score B
                  <input
                    type="number"
                    value={values.scoreB ?? ""}
                    onChange={handleNumberChange("scoreB", true)}
                    className="surface-input"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Sets A
                  <input
                    type="number"
                    value={values.setsA ?? ""}
                    onChange={handleNumberChange("setsA", true)}
                    className="surface-input"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Sets B
                  <input
                    type="number"
                    value={values.setsB ?? ""}
                    onChange={handleNumberChange("setsB", true)}
                    className="surface-input"
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-white/70">
                  Joué le (date)
                  <input
                    type="date"
                    value={values.playedDate ?? ""}
                    onChange={handleTextChange("playedDate")}
                    className="surface-input"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Heure
                  <input
                    type="time"
                    value={values.playedTime ?? ""}
                    onChange={handleTextChange("playedTime")}
                    className="surface-input"
                  />
                </label>
              </div>
            </div>
            <div className="surface-card--flat">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Liens</p>
              <div className="mt-3 space-y-3">
                <label className="space-y-2 text-sm text-white/70">
                  Proof URL
                  <input
                    type="url"
                    value={values.proofUrl ?? ""}
                    onChange={handleTextChange("proofUrl")}
                    className="surface-input"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  VOD URL
                  <input
                    type="url"
                    value={values.vodUrl ?? ""}
                    onChange={handleTextChange("vodUrl")}
                    className="surface-input"
                  />
                </label>
              </div>
            </div>
          </div>

          <label className="space-y-2 text-sm text-white/70">
            Notes
            <textarea
              value={values.notes ?? ""}
              onChange={handleTextChange("notes")}
              rows={3}
              className="surface-input"
            />
          </label>

          {errorMessage ? (
            <div className="surface-alert surface-alert--error">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="surface-pill px-4 py-2 text-sm text-white/70 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Sauvegarde..." : "Sauver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
