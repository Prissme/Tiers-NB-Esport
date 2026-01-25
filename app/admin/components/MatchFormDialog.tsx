"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues,
  });

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
    form.reset(values);
  }, [form, initialValues, seasonId]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    setErrorMessage(null);

    const payload = {
      day: values.day,
      day_label: values.dayLabel || null,
      round: extractRound(values.round ?? null, values.matchGroup),
      match_group: values.matchGroup,
      phase: values.phase,
      division: values.division,
      best_of: values.bestOf ?? null,
      status: values.status,
      team_a_id: values.teamAId,
      team_b_id: values.teamBId,
      scheduled_at: toTimestamp(values.scheduledDate, values.scheduledTime),
      start_time: toTimestamp(values.startDate, values.startTime),
      played_at: toTimestamp(values.playedDate, values.playedTime),
      score_a: values.scoreA ?? null,
      score_b: values.scoreB ?? null,
      sets_a: values.setsA ?? null,
      sets_b: values.setsB ?? null,
      notes: values.notes || null,
      proof_url: values.proofUrl || null,
      vod_url: values.vodUrl || null,
      season_id: values.seasonId ?? seasonId ?? null,
    };

    const query = values.id
      ? supabase.from("lfn_matches").update(payload).eq("id", values.id)
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
  });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-950/90 p-6 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/70">LFN Admin</p>
            <h2 className="text-2xl font-semibold text-white">
              {initialValues?.id ? "Modifier le match" : "Créer un match"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:text-white"
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
                {...form.register("day")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Label jour
              <input
                type="text"
                {...form.register("dayLabel")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Round (num)
              <input
                type="number"
                {...form.register("round")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-white/70">
              Match label
              <input
                type="text"
                {...form.register("matchGroup")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Phase
              <input
                type="text"
                {...form.register("phase")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Division
              <input
                type="text"
                {...form.register("division")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-white/70">
              Equipe A
              <select
                {...form.register("teamAId")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
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
                {...form.register("teamBId")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
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
                {...form.register("bestOf")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Status
              <select
                {...form.register("status")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
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
                {...form.register("seasonId")}
                placeholder={seasonId ?? "UUID"}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Programmé</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-white/70">
                  Date
                  <input
                    type="date"
                    {...form.register("scheduledDate")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Heure
                  <input
                    type="time"
                    {...form.register("scheduledTime")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </label>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Start time</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-white/70">
                  Date
                  <input
                    type="date"
                    {...form.register("startDate")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Heure
                  <input
                    type="time"
                    {...form.register("startTime")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Résultat</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-white/70">
                  Score A
                  <input
                    type="number"
                    {...form.register("scoreA")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Score B
                  <input
                    type="number"
                    {...form.register("scoreB")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Sets A
                  <input
                    type="number"
                    {...form.register("setsA")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Sets B
                  <input
                    type="number"
                    {...form.register("setsB")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-white/70">
                  Joué le (date)
                  <input
                    type="date"
                    {...form.register("playedDate")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Heure
                  <input
                    type="time"
                    {...form.register("playedTime")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </label>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Liens</p>
              <div className="mt-3 space-y-3">
                <label className="space-y-2 text-sm text-white/70">
                  Proof URL
                  <input
                    type="url"
                    {...form.register("proofUrl")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  VOD URL
                  <input
                    type="url"
                    {...form.register("vodUrl")}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  />
                </label>
              </div>
            </div>
          </div>

          <label className="space-y-2 text-sm text-white/70">
            Notes
            <textarea
              {...form.register("notes")}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-100">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white"
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
