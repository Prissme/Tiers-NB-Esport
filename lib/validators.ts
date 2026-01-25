import { z } from "zod";

export const num = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} doit être un nombre.` })
    .int(`${label} doit être un entier.`);

export const toTimestamp = (date?: string | null, time?: string | null) => {
  if (!date || !time) {
    return null;
  }
  return `${date}T${time}:00`;
};

export const matchFormSchema = z.object({
  id: z.string().uuid().optional(),
  day: num("Jour"),
  dayLabel: z.string().trim().optional().nullable(),
  round: num("Round").optional().nullable(),
  matchGroup: z.string().trim().min(1, "Match label requis."),
  phase: z.string().trim().min(1, "Phase requise."),
  division: z.string().trim().min(1, "Division requise."),
  bestOf: num("Best of").optional().nullable(),
  status: z.string().trim().min(1, "Status requis."),
  teamAId: z.string().uuid({ message: "Equipe A invalide." }),
  teamBId: z.string().uuid({ message: "Equipe B invalide." }),
  scheduledDate: z.string().optional().nullable(),
  scheduledTime: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  startTime: z.string().optional().nullable(),
  playedDate: z.string().optional().nullable(),
  playedTime: z.string().optional().nullable(),
  scoreA: num("Score A").optional().nullable(),
  scoreB: num("Score B").optional().nullable(),
  setsA: num("Sets A").optional().nullable(),
  setsB: num("Sets B").optional().nullable(),
  notes: z.string().optional().nullable(),
  proofUrl: z.string().url("Proof URL invalide.").optional().nullable().or(z.literal("")),
  vodUrl: z.string().url("VOD URL invalide.").optional().nullable().or(z.literal("")),
  seasonId: z.string().uuid().optional().nullable(),
});

export type MatchFormValues = z.infer<typeof matchFormSchema>;

export const extractRound = (round: number | null | undefined, matchGroup: string) => {
  if (round && !Number.isNaN(round)) {
    return round;
  }
  const match = matchGroup.match(/(\d+)/);
  if (match) {
    return Number(match[1]);
  }
  return null;
};
