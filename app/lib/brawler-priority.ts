// Reflète exactement MAP_PRIORITY dans discord-bot/draft.js.
// Si tu modifies les priorités côté bot de draft, reporte le changement ici aussi.
export const MAP_PRIORITY: Record<string, 0 | 1 | 2> = {
  Piper: 2, Belle: 2, Tara: 2, Juju: 2, Mina: 2, Cordelius: 2, Moe: 2, Finx: 2, Lumi: 2,
  Kit: 2, Najia: 2, Gray: 2, Damian: 2, Sirius: 2, Colt: 2, Spike: 2, Bull: 2, Emz: 2,
  Shelly: 2, Dynamike: 2, Chester: 2, Crow: 2, Gene: 2, Bolt: 2, Pierce: 2, Angelo: 2, Charlie: 2,

  Bo: 1, Berry: 1, Stu: 1, Brock: 1, Sandy: 1, Rosa: 1, Mortis: 1, Buster: 1, Pam: 1,
  Gus: 1, Ruffs: 1, Carl: 1, Otis: 1, Alli: 1, Griff: 1, Meeple: 1, Squeak: 1, Surge: 1,
  Sam: 1, Maisie: 1, Penny: 1, Gale: 1, Janet: 1, Amber: 1, Lily: 1, Rico: 1, Pearl: 1,
  Edgar: 1, Nita: 1, Leon: 1, Kenji: 1, Melodie: 1, Byron: 1, Poco: 1, Draco: 1, Glowy: 1,
  Colette: 1, Ziggy: 1, Bibi: 1, Lou: 1, Fang: 1, Ash: 1, Nova: 1, Meg: 1, Shade: 1,
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
