// Moteur du tournoi Swiss (section NWC).
// Portage du dashboard « Swiss Stage ». Aucun import serveur ici : ce fichier
// est chargé à la fois par l'API admin, la page publique et le panel admin.

export const QUAL_WINS = 3;
export const QUAL_LOSSES = 3;
export const TOP = 8;
export const SWISS_ROUNDS = 3;

export type Phase = 1 | 2;

export type NwcTeam = { id: number; name: string; w: number; l: number; bye: boolean };

export type NwcMatch = {
  a: number;
  b: number | null;
  w: number | null;
  done: boolean;
  round: number;
  ra: [number, number];
  rb: [number, number] | null;
};

export type NwcResult = { p: Phase; r: number; w: string; l: string | null };

export type NwcState = {
  phase: Phase;
  round: number;
  teams: NwcTeam[];
  names: Record<string, string>;
  rounds: { "1": NwcMatch[][]; "2": NwcMatch[][] };
  results: NwcResult[];
};

export class NwcError extends Error {}

export type Tag = { cls: "Q" | "A" | "E"; label: string };

export const emptyState = (): NwcState => ({
  phase: 1,
  round: 0,
  teams: [],
  names: {},
  rounds: { "1": [], "2": [] },
  results: [],
});

const clone = (state: NwcState): NwcState => JSON.parse(JSON.stringify(state)) as NwcState;

export const nameOf = (s: NwcState, id: number | null): string =>
  id === null ? "" : s.names[String(id)] ?? "";

const teamOf = (s: NwcState, id: number) => s.teams.find((t) => t.id === id);

export const roundsOf = (s: NwcState, v: Phase): NwcMatch[][] =>
  s.rounds[String(v) as "1" | "2"] ?? [];

const setRoundsOf = (s: NwcState, v: Phase, rounds: NwcMatch[][]) => {
  s.rounds[String(v) as "1" | "2"] = rounds;
};

export const curMatches = (s: NwcState): NwcMatch[] => roundsOf(s, s.phase)[s.round - 1] ?? [];

export const qualStatus = (t: NwcTeam): "Q" | "A" | "E" =>
  t.w >= QUAL_WINS ? "Q" : t.l >= QUAL_LOSSES ? "E" : "A";

export const totalRounds = (v: Phase) => (v === 1 ? QUAL_WINS + QUAL_LOSSES - 1 : SWISS_ROUNDS);

export const roundDone = (s: NwcState) => s.round > 0 && curMatches(s).every((m) => m.done);

export const tagFor = (s: NwcState, t: NwcTeam): Tag => {
  if (s.phase === 1) {
    const q = qualStatus(t);
    return { cls: q, label: { Q: "Qualifié", A: "En lice", E: "Éliminé" }[q] };
  }
  const finished = s.round === SWISS_ROUNDS && curMatches(s).every((m) => m.done);
  if (!finished) return { cls: "A", label: "En cours" };
  if (t.w >= 3) return { cls: "Q", label: "1re" };
  if (t.w === 2) return { cls: "A", label: "2e à 4e" };
  if (t.w === 1) return { cls: "A", label: "5e à 7e" };
  return { cls: "E", label: "8e" };
};

const orderOf = (cls: Tag["cls"]) => ({ Q: 0, A: 1, E: 2 })[cls];

export const sortTeams = (s: NwcState): NwcTeam[] =>
  [...s.teams].sort(
    (x, y) =>
      orderOf(tagFor(s, x).cls) - orderOf(tagFor(s, y).cls) || y.w - x.w || x.l - y.l
  );

/** Bilans recalculés depuis l'historique des matchs de la phase donnée. */
export const recordsOf = (s: NwcState, v: Phase) => {
  const rec: Record<number, { w: number; l: number }> = {};
  roundsOf(s, v).forEach((rs) =>
    (rs ?? []).forEach((m) => {
      [m.a, m.b].forEach((id) => {
        if (id !== null && !rec[id]) rec[id] = { w: 0, l: 0 };
      });
      if (m.done && m.w !== null) {
        rec[m.w].w++;
        const loser = m.w === m.a ? m.b : m.a;
        if (loser !== null) rec[loser].l++;
      }
    })
  );
  return rec;
};

const removeResult = (s: NwcState, target: NwcResult) => {
  const k = s.results.findIndex(
    (x) => x.p === target.p && x.r === target.r && x.w === target.w && x.l === target.l
  );
  if (k >= 0) s.results.splice(k, 1);
};

/** Raison pour laquelle on ne peut pas générer le round suivant, sinon null. */
export const nextRoundBlocked = (s: NwcState): string | null => {
  if (s.teams.length === 0) return "Crée d'abord un tournoi.";
  if (s.round > 0 && !roundDone(s)) return "Termine les matchs du round en cours.";
  if (s.phase === 2 && s.round >= SWISS_ROUNDS) return "La phase 2 est terminée.";
  if (s.phase === 1 && s.round > 0 && s.teams.filter((t) => qualStatus(t) === "A").length < 2)
    return "La phase 1 est terminée.";
  return null;
};

/** Raison pour laquelle on ne peut pas lancer la phase 2, sinon null. */
export const phase2Blocked = (s: NwcState): string | null => {
  if (s.phase === 2) return "La phase 2 est déjà lancée.";
  if (s.round > 0 && !roundDone(s)) return "Termine les matchs du round en cours.";
  const q = s.teams.filter((t) => qualStatus(t) === "Q").length;
  if (q < TOP) return `Il faut ${TOP} équipes qualifiées (actuellement ${q}).`;
  return null;
};

export const createTournament = (names: string[]): NwcState => {
  const clean = names.map((n) => String(n).trim()).filter(Boolean);
  if (clean.length < 2) throw new NwcError("Il faut au moins 2 équipes.");
  const s = emptyState();
  s.teams = clean.map((name, id) => ({ id, name, w: 0, l: 0, bye: false }));
  s.names = Object.fromEntries(s.teams.map((t) => [String(t.id), t.name]));
  return nextRound(s);
};

export const nextRound = (input: NwcState): NwcState => {
  const s = clone(input);
  const blocked = nextRoundBlocked(s);
  if (blocked) throw new NwcError(blocked);

  const pool = s.phase === 1 ? s.teams.filter((t) => qualStatus(t) === "A") : [...s.teams];
  if (pool.length < 2) throw new NwcError("Plus assez d'équipes en lice.");
  pool.sort((x, y) => y.w - x.w || x.l - y.l || Math.random() - 0.5);

  const r = s.round + 1;
  const matches: NwcMatch[] = [];

  // Bye si nombre impair : on prend le moins bon qui n'a pas encore eu de bye
  if (pool.length % 2) {
    let idx = -1;
    for (let i = pool.length - 1; i >= 0; i--) {
      if (!pool[i].bye) {
        idx = i;
        break;
      }
    }
    if (idx < 0) idx = pool.length - 1;
    const t = pool.splice(idx, 1)[0];
    const ra: [number, number] = [t.w, t.l];
    t.bye = true;
    t.w++;
    matches.push({ a: t.id, b: null, w: t.id, done: true, round: r, ra, rb: null });
    s.results.push({ p: s.phase, r, w: nameOf(s, t.id), l: null });
  }

  // Appariement par bilan (revanches autorisées)
  while (pool.length) {
    const a = pool.shift()!;
    const b = pool.shift()!;
    matches.push({
      a: a.id,
      b: b.id,
      w: null,
      done: false,
      round: r,
      ra: [a.w, a.l],
      rb: [b.w, b.l],
    });
  }

  s.round = r;
  const rounds = roundsOf(s, s.phase).slice(0, r - 1);
  rounds.push(matches);
  setRoundsOf(s, s.phase, rounds);
  return s;
};

export const setWinner = (input: NwcState, index: number, which: 0 | 1): NwcState => {
  const s = clone(input);
  if (which !== 0 && which !== 1) throw new NwcError("Choix de victoire invalide.");
  const m = curMatches(s)[index];
  if (!m || m.done) throw new NwcError("Match introuvable ou déjà joué.");
  const aId = m.a;
  const bId = m.b;
  if (bId === null) throw new NwcError("Un bye ne se joue pas.");
  const winner = which === 0 ? aId : bId;
  const loser = which === 0 ? bId : aId;
  teamOf(s, winner)!.w++;
  teamOf(s, loser)!.l++;
  m.w = winner;
  m.done = true;
  s.results.push({ p: s.phase, r: m.round, w: nameOf(s, winner), l: nameOf(s, loser) });
  return s;
};

export const undoWinner = (input: NwcState, index: number): NwcState => {
  const s = clone(input);
  const m = curMatches(s)[index];
  if (!m || !m.done || m.b === null || m.w === null) {
    throw new NwcError("Rien à annuler sur ce match.");
  }
  const winner = m.w;
  const loser = winner === m.a ? m.b : m.a;
  teamOf(s, winner)!.w--;
  teamOf(s, loser)!.l--;
  removeResult(s, { p: s.phase, r: m.round, w: nameOf(s, winner), l: nameOf(s, loser) });
  m.w = null;
  m.done = false;
  return s;
};

/** Retire les effets du round courant (scores et byes) avant de le remplacer. */
const clearRound = (s: NwcState) => {
  curMatches(s).forEach((m) => {
    if (!m.done || m.w === null) return;
    const winner = m.w;
    if (m.b !== null) {
      const loser = winner === m.a ? m.b : m.a;
      teamOf(s, winner)!.w--;
      teamOf(s, loser)!.l--;
      removeResult(s, { p: s.phase, r: m.round, w: nameOf(s, winner), l: nameOf(s, loser) });
    } else {
      const t = teamOf(s, winner)!;
      t.w--;
      t.bye = false;
      removeResult(s, { p: s.phase, r: m.round, w: nameOf(s, winner), l: null });
    }
  });
  setRoundsOf(
    s,
    s.phase,
    roundsOf(s, s.phase).map((rs, i) => (i === s.round - 1 ? [] : rs))
  );
};

/** Matchups manuels : une ligne par match, « A vs B » ou « A bye ». Remplace le round courant. */
export const applyManual = (input: NwcState, text: string): NwcState => {
  const s = clone(input);
  if (s.round < 1) throw new NwcError("Génère d'abord un round.");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) throw new NwcError("Entre au moins un matchup.");

  const findTeam = (name: string) => {
    const n = name.trim().toLowerCase();
    return s.teams.find((t) => t.name.trim().toLowerCase() === n);
  };
  const used = new Set<number>();
  const take = (team: NwcTeam | undefined, line: string): NwcTeam => {
    if (!team) throw new NwcError(`Équipe introuvable dans « ${line} ».`);
    if (used.has(team.id)) throw new NwcError(`${team.name} apparaît plusieurs fois.`);
    used.add(team.id);
    return team;
  };

  const parsed: Array<{ a: NwcTeam; b: NwcTeam | null }> = [];
  for (const line of lines) {
    let m = line.match(/^(.+?)\s+vs\s+(.+)$/i);
    if (m) {
      parsed.push({ a: take(findTeam(m[1]), line), b: take(findTeam(m[2]), line) });
      continue;
    }
    m = line.match(/^(.+?)\s+bye$/i);
    if (m) {
      parsed.push({ a: take(findTeam(m[1]), line), b: null });
      continue;
    }
    throw new NwcError(
      `Ligne incorrecte : « ${line} ». Format : « Équipe A vs Équipe B » ou « Équipe bye ».`
    );
  }

  clearRound(s);
  const r = s.round;
  const matches: NwcMatch[] = parsed.map(({ a, b }) => {
    if (!b) {
      const ra: [number, number] = [a.w, a.l];
      a.w++;
      a.bye = true;
      s.results.push({ p: s.phase, r, w: a.name, l: null });
      return { a: a.id, b: null, w: a.id, done: true, round: r, ra, rb: null };
    }
    return {
      a: a.id,
      b: b.id,
      w: null,
      done: false,
      round: r,
      ra: [a.w, a.l],
      rb: [b.w, b.l],
    };
  });
  setRoundsOf(
    s,
    s.phase,
    roundsOf(s, s.phase).map((rs, i) => (i === r - 1 ? matches : rs))
  );
  return s;
};

export const startPhase2 = (input: NwcState): NwcState => {
  const blocked = phase2Blocked(input);
  if (blocked) throw new NwcError(blocked);
  const s = clone(input);
  const qualified = s.teams
    .filter((t) => qualStatus(t) === "Q")
    .sort((a, b) => a.l - b.l || b.w - a.w);
  s.teams = qualified.slice(0, TOP).map((t) => ({ id: t.id, name: t.name, w: 0, l: 0, bye: false }));
  s.phase = 2;
  s.round = 0;
  s.rounds["2"] = [];
  return nextRound(s);
};

/* ============ Annonces Discord (texte généré, comme le dashboard) ============ */

export const announceMatches = (s: NwcState): string => {
  const cur = curMatches(s);
  if (!cur.length) throw new NwcError("Génère d'abord un round.");
  const lines = cur.map((m, i) => {
    if (m.b === null) {
      return `• **Match ${i + 1}:** ${nameOf(s, m.a)} (${m.ra.join("-")}) ➡️ *BYE (automatic win)*`;
    }
    const rb = m.rb ? m.rb.join("-") : "0-0";
    return `• **Match ${i + 1}:** ${nameOf(s, m.a)} (${m.ra.join("-")}) vs ${nameOf(s, m.b)} (${rb})`;
  });
  const title = s.phase === 1 ? `Qualifiers · Round ${s.round}` : `Phase 2 Swiss · Round ${s.round}`;
  return `⚔️ **${title} : Matches**\n\n` + lines.join("\n") + "\n\nGood luck to everyone!";
};

export const announceStandings = (s: NwcState): string => {
  const line = (t: NwcTeam) => `• **${t.name}** : ${t.w}-${t.l}`;
  const sorted = sortTeams(s);
  if (s.phase === 1) {
    const group = (cls: Tag["cls"]) => sorted.filter((t) => tagFor(s, t).cls === cls);
    let msg = `🏆 **Qualifiers standings: Round ${s.round}**\n\n`;
    msg += `✅ **Qualified (${group("Q").length})**\n` + (group("Q").map(line).join("\n") || "_None yet_") + "\n\n";
    msg += `⚔️ **Still in (${group("A").length})**\n` + (group("A").map(line).join("\n") || "_None_") + "\n\n";
    msg += `❌ **Eliminated (${group("E").length})**\n` + (group("E").map(line).join("\n") || "_None yet_");
    return msg;
  }
  const groups: Array<[string, (t: NwcTeam) => boolean]> = [
    ["🥇 **1st place**", (t) => t.w >= 3],
    ["🥈 **2nd–4th**", (t) => t.w === 2],
    ["🥉 **5th–7th**", (t) => t.w === 1],
    ["**8th**", (t) => t.w === 0],
  ];
  return (
    `🏆 **Phase 2 Swiss: Round ${s.round}/${SWISS_ROUNDS}**\n\n` +
    groups
      .map(([title, f]) => {
        const members = sorted.filter(f);
        return `${title}\n` + (members.length ? members.map(line).join("\n") : "_—_");
      })
      .join("\n\n")
  );
};
