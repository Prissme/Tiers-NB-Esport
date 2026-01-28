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
  matchGroup: initialValues?.matchGroup ?? "Match",
  phase: initialValues?.phase ?? "regular",
  division: initialValues?.division ?? "D1",
  bestOf: initialValues?.bestOf ?? null,
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
  attachments: initialValues?.attachments ?? [],
  seasonId: initialValues?.seasonId ?? seasonId ?? null,
});

const splitTimestamp = (value?: string | null) => {
  if (!value) {
    return { date: "", time: "" };
  }
  const [date, time] = value.split("T");
  return { date, time: (time ?? "").slice(0, 5) };
};

const parseAttachments = (notes?: string | null) => {
  if (!notes) return [];
  try {
    const parsed = JSON.parse(notes) as { attachments?: string[] };
    if (Array.isArray(parsed.attachments)) {
      return parsed.attachments.filter((item) => typeof item === "string");
    }
    return [];
  } catch (error) {
    return [];
  }
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
    values.attachments = parseAttachments(values.notes);
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
    const cleanedValues = {
      ...values,
      attachments: (values.attachments ?? []).filter(Boolean),
    };
    const parsed = matchFormSchema.safeParse(cleanedValues);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Validation invalide.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);

    const scheduledAt = toTimestamp(parsed.data.scheduledDate, parsed.data.scheduledTime);
    const startTime = toTimestamp(parsed.data.startDate, parsed.data.startTime) ?? scheduledAt;
    const status =
      parsed.data.scoreA !== null && parsed.data.scoreB !== null ? "finished" : "scheduled";

    const notesPayload = parsed.data.attachments?.length
      ? JSON.stringify({ attachments: parsed.data.attachments })
      : null;

    const payload = {
      day: parsed.data.day,
      day_label: parsed.data.dayLabel || null,
      round: extractRound(parsed.data.round ?? null, parsed.data.matchGroup),
      match_group: parsed.data.matchGroup,
      phase: parsed.data.phase,
      division: parsed.data.division,
      best_of: parsed.data.bestOf ?? null,
      status,
      team_a_id: parsed.data.teamAId,
      team_b_id: parsed.data.teamBId,
      scheduled_at: scheduledAt,
      start_time: startTime,
      played_at: toTimestamp(parsed.data.playedDate, parsed.data.playedTime),
      score_a: parsed.data.scoreA ?? null,
      score_b: parsed.data.scoreB ?? null,
      sets_a: parsed.data.setsA ?? null,
      sets_b: parsed.data.setsB ?? null,
      notes: notesPayload,
      proof_url: null,
      vod_url: null,
      season_id: null,
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
              Division
              <input
                type="text"
                value={values.division}
                onChange={handleTextChange("division")}
                className="surface-input"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Date du match
              <input
                type="date"
                value={values.scheduledDate ?? ""}
                onChange={handleTextChange("scheduledDate")}
                className="surface-input"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Heure du match
              <input
                type="time"
                value={values.scheduledTime ?? ""}
                onChange={handleTextChange("scheduledTime")}
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

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-white/70">
              Score équipe A
              <input
                type="number"
                value={values.scoreA ?? ""}
                onChange={handleNumberChange("scoreA", true)}
                className="surface-input"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Score équipe B
              <input
                type="number"
                value={values.scoreB ?? ""}
                onChange={handleNumberChange("scoreB", true)}
                className="surface-input"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                Pièces jointes
              </p>
              <button
                type="button"
                onClick={() => updateField("attachments", [...(values.attachments ?? []), ""])}
                className="surface-pill px-3 py-1 text-xs text-white/70 hover:text-white"
              >
                Ajouter une pièce jointe
              </button>
            </div>
            <div className="space-y-2">
              {(values.attachments ?? []).length === 0 ? (
                <p className="text-xs text-white/40">
                  Aucune pièce jointe ajoutée.
                </p>
              ) : null}
              {(values.attachments ?? []).map((item, index) => (
                <div key={`attachment-${index}`} className="flex items-center gap-2">
                  <input
                    type="url"
                    value={item}
                    onChange={(event) => {
                      const next = [...(values.attachments ?? [])];
                      next[index] = event.target.value;
                      updateField("attachments", next);
                    }}
                    placeholder="Lien de pièce jointe"
                    className="surface-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(values.attachments ?? [])];
                      next.splice(index, 1);
                      updateField("attachments", next);
                    }}
                    className="surface-pill px-3 py-1 text-xs text-white/70 hover:text-white"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          </div>

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
