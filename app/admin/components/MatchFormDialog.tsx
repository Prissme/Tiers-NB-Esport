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
  if (!value) return { date: "", time: "" };
  const [date, time] = value.split("T");
  return { date, time: (time ?? "").slice(0, 5) };
};

const parseAttachments = (notes?: string | null) => {
  if (!notes) return [];
  try {
    const parsed = JSON.parse(notes) as { attachments?: string[] };
    return Array.isArray(parsed.attachments) ? parsed.attachments.filter((item) => typeof item === "string") : [];
  } catch {
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

  const defaultValues = useMemo(() => buildDefaultValues(initialValues, seasonId), [initialValues, seasonId]);
  const [values, setValues] = useState<MatchFormValues>(defaultValues);

  useEffect(() => {
    const vals = buildDefaultValues(initialValues, seasonId);
    if (initialValues?.scheduledDate === undefined) {
      const scheduled = splitTimestamp((initialValues as any)?.scheduled_at);
      vals.scheduledDate = scheduled.date;
      vals.scheduledTime = scheduled.time;
    }
    vals.attachments = parseAttachments(vals.notes);
    setValues(vals);
  }, [initialValues, seasonId]);

  const updateField = <Key extends keyof MatchFormValues>(field: Key, value: MatchFormValues[Key]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  // --- FONCTION DE SYNCHRO DU CLASSEMENT ---
  const syncStandings = async (teamAId: string, teamBId: string) => {
    // Cette fonction demande à Supabase de recalculer les points (si tu as configuré les RPC ou via une mise à jour directe)
    // Pour l'instant, on force un rafraîchissement des données locales pour que le site réagisse.
    console.log("Synchronisation du classement pour :", teamAId, teamBId);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanedValues = { ...values, attachments: (values.attachments ?? []).filter(Boolean) };
    const parsed = matchFormSchema.safeParse(cleanedValues);

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Validation invalide.");
      return;
    }

    setSaving(true);
    const scheduledAt = toTimestamp(parsed.data.scheduledDate, parsed.data.scheduledTime);
    const status = parsed.data.status;
    const isFinished = status === "finished";

    const payload = {
      day: parsed.data.day,
      round: extractRound(parsed.data.round ?? null, parsed.data.matchGroup),
      match_group: parsed.data.matchGroup,
      phase: parsed.data.phase,
      division: parsed.data.division,
      status,
      team_a_id: parsed.data.teamAId,
      team_b_id: parsed.data.teamBId,
      scheduled_at: scheduledAt,
      score_a: isFinished ? parsed.data.scoreA : null,
      score_b: isFinished ? parsed.data.scoreB : null,
      season_id: parsed.data.seasonId ?? seasonId,
    };

    const { error } = parsed.data.id 
      ? await supabase.from("lfn_matches").update(payload).eq("id", parsed.data.id)
      : await supabase.from("lfn_matches").insert(payload);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
    } else {
      // SI LE MATCH EST FINI, ON DIT AU SITE DE TOUT RECHARGER
      if (isFinished) {
        await syncStandings(parsed.data.teamAId, parsed.data.teamBId);
      }
      setSaving(false);
      onSaved();
      onOpenChange(false);
      window.location.reload(); // Solution radicale mais efficace pour forcer la synchro du classement sans code complexe
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="surface-card w-full max-w-4xl bg-slate-950/90 shadow-2xl backdrop-blur p-6 rounded-xl border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-400 font-bold">LFN System Auto-Sync</p>
            <h2 className="text-2xl font-semibold text-white">
              {initialValues?.id ? "Mettre à jour le Résultat" : "Créer un match"}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-white/70">Statut
              <select value={values.status} onChange={(e) => updateField("status", e.target.value as any)} className="w-full mt-1 bg-white/5 border border-white/10 p-2 rounded text-white">
                <option value="scheduled">Programmé</option>
                <option value="live">🔴 En direct</option>
                <option value="finished">✅ Terminé (Met à jour le classement)</option>
              </select>
            </label>
            <label className="text-sm text-white/70">Division
              <input type="text" value={values.division} onChange={(e) => updateField("division", e.target.value)} className="w-full mt-1 bg-white/5 border border-white/10 p-2 rounded text-white" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 bg-white/5 p-4 rounded-lg border border-white/5">
            <div className="space-y-4">
              <label className="text-sm font-bold text-amber-400">Équipe A</label>
              <select value={values.teamAId} onChange={(e) => updateField("teamAId", e.target.value)} className="w-full bg-white/10 p-2 rounded text-white">
                <option value="">Sélectionner</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input type="number" placeholder="Score A" value={values.scoreA ?? ""} onChange={(e) => updateField("scoreA", Number(e.target.value))} className="w-full bg-white/10 p-2 rounded text-white text-center text-xl font-bold" />
            </div>
            <div className="space-y-4">
              <label className="text-sm font-bold text-blue-400">Équipe B</label>
              <select value={values.teamBId} onChange={(e) => updateField("teamBId", e.target.value)} className="w-full bg-white/10 p-2 rounded text-white">
                <option value="">Sélectionner</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input type="number" placeholder="Score B" value={values.scoreB ?? ""} onChange={(e) => updateField("scoreB", Number(e.target.value))} className="w-full bg-white/10 p-2 rounded text-white text-center text-xl font-bold" />
            </div>
          </div>

          {errorMessage && <div className="p-3 bg-red-500/20 border border-red-500 text-red-200 text-sm rounded">{errorMessage}</div>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={() => onOpenChange(false)} className="text-white/50 hover:text-white transition">Annuler</button>
            <button type="submit" disabled={saving} className="bg-amber-400 hover:bg-amber-300 text-black font-bold py-2 px-8 rounded-full transition disabled:opacity-50">
              {saving ? "Calcul en cours..." : "VALIDER LE MATCH"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
