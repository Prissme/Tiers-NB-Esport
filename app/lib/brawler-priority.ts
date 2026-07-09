// Reflète exactement MAP_PRIORITY dans discord-bot/draft.js.
// Si tu modifies les priorités côté bot de draft, reporte le changement ici aussi.
export const MAP_PRIORITY: Record<string, 0 | 1 | 2> = {
  Piper: 2, Belle: 2, Tara: 2, Juju: 2, Mina: 2, Cordelius: 2, Moe: 2, Finx: 2, Lumi: 2,
  Kit: 2, Najia: 2, Gray: 2, Damian: 2, Sirius: 2, Colt: 2, Spike: 2, Bull: 2, Emz: 2,
  Shelly: 2, Dynamike: 2, Chester: 2, Crow: 2, Gene: 2, Bolt: 2, Pierce: 2, Angelo: 2, Charlie: 2,

  Bo: 1, Berry: 1, Stu: 1, Brock: 1, Sandy: 1, Rosa: 1, Mortis: 1, Buster: 1, Pam: 1, Chuck: 1,
  Gus: 1, Ruffs: 1, Carl: 1, Otis: 1, Alli: 1, Griff: 1, Meeple: 1, Squeak: 1, Surge: 1,
  Sam: 1, Maisie: 1, Penny: 1, Gale: 1, Janet: 1, Amber: 1, Lily: 1, Rico: 1, Pearl: 1, Barley: 1, Bea: 1,
  Edgar: 1, Nita: 1, Leon: 1, Kenji: 1, Melodie: 1, Byron: 1, Poco: 1, Draco: 1, Glowy: 1,
  Colette: 1, Ziggy: 1, Bibi: 1, Lou: 1, Fang: 1, Ash: 1, Nova: 1, Meg: 1, Shade: 1, Mico: 1,
  Clancy: 1, Max: 1, Jessie: 1, "El Primo": 1, Darryl: 1,

  Trunk: 0, Hank: 0, Frank: 0,
};

// Plus la priorité de draft est basse, plus un bon K/D avec ce brawler est valorisé
// (il est "sous-optimal" en draft donc plus dur à faire performer).
export const DIFFICULTY_MULTIPLIER: Record<0 | 1 | 2, number> = {
  2: 1.0,
  1: 1.2,
  0: 1.45,
};

export function getBrawlerPriority(brawler: string): 0 | 1 | 2 | null {
  return brawler in MAP_PRIORITY ? MAP_PRIORITY[brawler] : null;
}

// Reflète COUNTER_BY_USER_PICK dans discord-bot/draft.js : pour une clé X, la liste
// donnée est l'ensemble des brawlers que X contre mécaniquement.
export const COUNTER_BY_PICK: Record<string, string[]> = {
  Bull: ["Shelly", "Spike", "Edgar"],
  Rosa: ["Shelly", "Spike"],
  "El Primo": ["Shelly", "Spike"],
  Darryl: ["Shelly", "Spike"],
  Jessie: ["Belle", "Mortis"],
  Nita: ["Belle"],
  Poco: ["Spike", "Emz", "Shade"],
  Piper: ["Gene", "Angelo"],
  Brock: ["Gene", "Moe", "Sirius", "Angelo", "Pierce"],
  Mortis: ["Shelly", "Spike", "Nita", "Charlie", "Sam", "Chester"],
  Frank: ["Shelly", "Spike", "Colt", "Bull", "Edgar", "Colette"],
  Buster: ["Spike", "Colt", "Belle"],
  Tara: ["Gene", "Belle"],
  Pam: ["Spike", "Belle"],
  Gus: ["Mortis", "Leon"],
  Juju: ["Gene", "Belle"],
  Ruffs: ["Spike", "Belle", "Gene", "Glowy", "Pierce"],
  Carl: ["Shelly", "Spike"],
  Mina: ["Gene", "Belle", "Crow"],
  Otis: ["Gene", "Belle", "Spike", "Colt", "Crow", "Chester"],
  Alli: ["Shelly", "Spike", "Nita", "Kit", "Bull", "Otis", "Crow"],
  Griff: ["Belle", "Gene", "Moe", "Finx", "Pierce"],
  Meeple: ["Belle", "Gene", "Mortis", "Emz", "Crow", "Shade", "Griff"],
  Squeak: ["Gene", "Belle", "Kenji"],
  Surge: ["Otis", "Belle", "Gene"],
  Trunk: ["Colt", "Spike", "Emz"],
  Sam: ["Shelly", "Spike", "Otis"],
  Cordelius: ["Belle", "Gene", "Otis"],
  Emz: ["Gene", "Piper", "Moe"],
  Maisie: ["Belle", "Gene"],
  Penny: ["Mortis", "Gale", "Gene"],
  Gale: ["Gene", "Belle", "Mortis"],
  Janet: ["Belle", "Gene", "Piper", "Spike", "Colt"],
  Amber: ["Spike", "Otis", "Gene", "Ash"],
  Charlie: ["Gene", "Belle", "Spike"],
  Lily: ["Shelly", "Spike", "Emz", "Ash"],
  Hank: ["Spike", "Otis", "Colt"],
  Moe: ["Belle", "Gene", "Piper", "Kenji"],
  Chester: ["Gene", "Belle", "Glowy", "Pierce", "Bolt", "Ash", "Otis", "Griff", "Najia"],
  Finx: ["Belle", "Gene", "Piper", "Ash", "Crow"],
  Kenji: ["Shelly", "Spike", "Otis", "Dynamike"],
  Ash: ["Shelly", "Emz", "Spike", "Shade", "Griff"],
  Rico: ["Piper", "Gene", "Spike"],
  Melodie: ["Gene", "Belle", "Otis"],
  Byron: ["Mortis", "Crow", "Dynamike", "Gene", "Glowy", "Angelo"],
  Berry: ["Dynamike", "Mortis", "Byron"],
  Draco: ["Spike", "Otis"],
  Lumi: ["Gene", "Belle"],
  Shade: ["Mortis", "Frank", "Emz", "Kit", "Najia", "Damian"],
  Glowy: ["Kit", "Bull", "Najia", "Sirius", "Bolt"],
  Kit: ["Gray", "Damian", "Sirius"],
  Colette: ["Gray", "Damian", "Sirius", "Crow", "Moe", "Ash", "Shade", "Najia"],
  Ziggy: ["Gray", "Damian", "Sirius"],
  Stu: ["Crow", "Meeple"],
  Colt: ["Gene", "Glowy"],
  Bolt: ["Gene", "Chester", "Glowy", "Shelly"],
  Najia: ["Pierce", "Crow", "Moe"],
  Pearl: ["Angelo", "Pierce", "Otis"],
  Pierce: ["Sirius", "Glowy", "Mortis", "Bolt", "Edgar"],
  Angelo: ["Leon", "Sirius"],
  Leon: ["Charlie", "Angelo", "Crow"],
  Dynamike: ["Edgar", "Mortis"],
  Fang: ["Surge", "Shelly"],
  Bo: ["Nova", "Colette", "Emz"],
  Meg: ["Crow", "Leon"],
  Edgar: ["Gale", "Clancy", "Shelly"],
  Max: ["Shelly", "Crow"],
  Sandy: ["Gene", "Otis"],
};

// +1 si `brawler` contre au moins un brawler de la comp adverse,
// -1 si un brawler de la comp adverse contre `brawler`, sinon 0.
export function getCounterEffect(brawler: string, opponentComp: string[]): number {
  const iCounterThem = (COUNTER_BY_PICK[brawler] ?? []).some((b) => opponentComp.includes(b));
  const theyCounterMe = opponentComp.some((opp) => (COUNTER_BY_PICK[opp] ?? []).includes(brawler));
  if (iCounterThem && !theyCounterMe) return 1;
  if (theyCounterMe && !iCounterThem) return -1;
  return 0;
}

// Reflète les Set de rôles dans discord-bot/draft.js (SUPPORTS/MELEES/SNIPERS_POKE/DIVE_UNITS/DISABLES).
export const SUPPORTS = new Set(["Gus", "Pam", "Ruffs", "Poco", "Byron", "Lumi", "Kit", "Gray", "Berry"]);
export const MELEES = new Set([
  "Frank", "Bull", "Hank", "Ash", "El Primo", "Mortis", "Sam", "Kenji", "Lily", "Rosa",
  "Darryl", "Draco", "Trunk", "Shade", "Damian", "Bolt", "Bibi", "Edgar", "Fang", "Nova", "Meg", "Mico", "Chuck",
]);
export const SNIPERS_POKE = new Set([
  "Piper", "Belle", "Brock", "Colt", "Rico", "Maisie", "Janet", "Najia", "Colette", "Dynamike",
  "Bo", "Griff", "Pierce", "Angelo", "Pearl", "Charlie", "Penny", "Lou", "Amber", "Barley", "Bea",
]);
export const DIVE_UNITS = new Set([
  "Mortis", "Alli", "Crow", "Lily", "Kenji", "Melodie", "Glowy", "Sirius", "Ziggy", "Stu", "Bolt", "Edgar", "Leon", "Fang", "Shade",
]);
export const DISABLES = new Set(["Spike", "Otis", "Rico", "Cordelius", "Bo", "Gene", "Chester", "Mina", "Charlie", "Lou", "Emz", "Gale"]);

export const GAME_MODES = [
  "Gem Grab", "Brawl Ball", "Heist", "Bounty", "Knockout", "Hot Zone", "Duo Showdown", "Siège",
] as const;
export type GameMode = (typeof GAME_MODES)[number];

// Bonus léger (+0.3) si le rôle du brawler colle bien au mode joué. Purement indicatif
// (le bot de draft n'a pas cette donnée), ça ne pénalise jamais, ça valorise juste un bon fit.
const MODE_ROLE_FIT: Record<GameMode, Set<string>[]> = {
  "Gem Grab": [SUPPORTS, SNIPERS_POKE],
  "Brawl Ball": [MELEES, DIVE_UNITS],
  Heist: [SNIPERS_POKE, DISABLES],
  Bounty: [SNIPERS_POKE],
  Knockout: [SNIPERS_POKE, DISABLES],
  "Hot Zone": [MELEES, SUPPORTS],
  "Duo Showdown": [DIVE_UNITS],
  Siège: [SNIPERS_POKE, SUPPORTS],
};

export function getModeFitBonus(brawler: string, mode: string | null): number {
  if (!mode || !(mode in MODE_ROLE_FIT)) return 0;
  const sets = MODE_ROLE_FIT[mode as GameMode];
  return sets.some((s) => s.has(brawler)) ? 0.3 : 0;
}
