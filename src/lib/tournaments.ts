// Types + validation partagés entre l'admin, les routes API et la page publique.
// Aucun import serveur ici : ce fichier est aussi chargé côté client.

export type TournamentStatus = "upcoming" | "live" | "finished";

export const TOURNAMENT_STATUSES: TournamentStatus[] = ["upcoming", "live", "finished"];
export const MAX_WINNERS = 6;

export type TournamentWinner = { name: string; country: string };

export type Tournament = {
  id: string;
  name: string;
  bannerUrl: string | null;
  status: TournamentStatus;
  startsAt: string | null;
  durationHours: number | null;
  teamsRegistered: number;
  teamsMax: number;
  cashprize: number;
  tierPoints: boolean;
  winners: TournamentWinner[];
};

export type TournamentRow = {
  id: string;
  name: string | null;
  banner_url: string | null;
  status: string | null;
  starts_at: string | null;
  duration_hours: number | string | null;
  teams_registered: number | null;
  teams_max: number | null;
  cashprize: number | string | null;
  tier_points: boolean | null;
  winners: unknown;
};

export const TOURNAMENT_COLUMNS =
  "id,name,banner_url,status,starts_at,duration_hours,teams_registered,teams_max,cashprize,tier_points,winners";

export const mapTournamentRow = (row: TournamentRow): Tournament => {
  const status = TOURNAMENT_STATUSES.includes(row.status as TournamentStatus)
    ? (row.status as TournamentStatus)
    : "upcoming";
  const winners = Array.isArray(row.winners)
    ? (row.winners as Array<Partial<TournamentWinner>>)
        .map((winner) => ({
          name: String(winner?.name ?? "").trim(),
          country: String(winner?.country ?? "FR").trim().toUpperCase(),
        }))
        .filter((winner) => winner.name)
        .slice(0, MAX_WINNERS)
    : [];
  return {
    id: row.id,
    name: row.name ?? "",
    bannerUrl: row.banner_url || null,
    status,
    startsAt: row.starts_at,
    durationHours: row.duration_hours === null ? null : Number(row.duration_hours),
    teamsRegistered: Number(row.teams_registered ?? 0),
    teamsMax: Number(row.teams_max ?? 0),
    cashprize: Number(row.cashprize ?? 0),
    tierPoints: Boolean(row.tier_points),
    winners,
  };
};

/**
 * Valide le corps envoyé par l'admin et le convertit en colonnes SQL.
 * `partial: true` (PATCH) : seuls les champs présents sont validés / écrits.
 */
export const parseTournamentInput = (
  body: unknown,
  partial: boolean
): { data: Record<string, unknown>; error?: undefined } | { data?: undefined; error: string } => {
  const input = (body ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const wants = (key: string) => !partial || input[key] !== undefined;

  const toCount = (value: unknown, label: string, max: number) => {
    const n = Number(value === "" || value === null || value === undefined ? 0 : value);
    if (!Number.isFinite(n) || n < 0 || n > max) return { error: `${label} invalide.` };
    return { value: Math.trunc(n) };
  };

  if (wants("name")) {
    const name = String(input.name ?? "").trim();
    if (!name) return { error: "Le nom du tournoi est obligatoire." };
    if (name.length > 80) return { error: "Le nom est trop long (80 caractères max)." };
    out.name = name;
  }

  if (wants("bannerUrl")) {
    const url = String(input.bannerUrl ?? "").trim();
    if (url && !/^(https?:\/\/|\/)/i.test(url)) {
      return { error: "L'URL de la bannière doit commencer par http(s):// ou /." };
    }
    if (url.length > 500) return { error: "L'URL de la bannière est trop longue." };
    out.banner_url = url || null;
  }

  if (wants("status")) {
    const status = String(input.status ?? "upcoming");
    if (!TOURNAMENT_STATUSES.includes(status as TournamentStatus)) {
      return { error: "Statut invalide." };
    }
    out.status = status;
  }

  if (wants("startsAt")) {
    const raw = input.startsAt;
    if (!raw) {
      out.starts_at = null;
    } else {
      const date = new Date(String(raw));
      if (Number.isNaN(date.getTime())) return { error: "Date invalide." };
      out.starts_at = date.toISOString();
    }
  }

  if (wants("durationHours")) {
    const raw = input.durationHours;
    if (raw === null || raw === undefined || raw === "") {
      out.duration_hours = null;
    } else {
      const hours = Number(raw);
      if (!Number.isFinite(hours) || hours < 0 || hours > 240) return { error: "Durée invalide." };
      out.duration_hours = Math.round(hours * 10) / 10;
    }
  }

  if (wants("teamsRegistered")) {
    const result = toCount(input.teamsRegistered, "Nombre d'équipes inscrites", 9999);
    if (result.error) return { error: result.error };
    out.teams_registered = result.value;
  }

  if (wants("teamsMax")) {
    const result = toCount(input.teamsMax, "Nombre d'équipes max", 9999);
    if (result.error) return { error: result.error };
    out.teams_max = result.value;
  }

  if (wants("cashprize")) {
    const amount = Number(input.cashprize === "" || input.cashprize === null || input.cashprize === undefined ? 0 : input.cashprize);
    if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) return { error: "Cashprize invalide." };
    out.cashprize = Math.round(amount * 100) / 100;
  }

  if (wants("tierPoints")) {
    out.tier_points = Boolean(input.tierPoints);
  }

  if (wants("winners")) {
    if (!Array.isArray(input.winners)) return { error: "Gagnants invalides." };
    const winners = (input.winners as Array<Partial<TournamentWinner>>)
      .map((winner) => {
        const country = String(winner?.country ?? "FR").trim().toUpperCase();
        return {
          name: String(winner?.name ?? "").trim().slice(0, 40),
          country: /^[A-Z]{2}$/.test(country) ? country : "FR",
        };
      })
      .filter((winner) => winner.name);
    if (winners.length > MAX_WINNERS) return { error: `${MAX_WINNERS} gagnants maximum.` };
    out.winners = winners;
  }

  if (Object.keys(out).length === 0) return { error: "Rien à modifier." };
  return { data: out };
};
