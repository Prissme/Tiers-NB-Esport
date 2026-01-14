export * from "./types";
export * from "./teams";
export * from "./matches";
export * from "./schedule";

import { matches } from "./matches";
import { teams } from "./teams";
import type { Match, Team } from "./types";

export const getTeamById = (id: string): Team | undefined =>
  teams.find((team) => team.id === id);

export const getMatchById = (id: string): Match | undefined =>
  matches.find((match) => match.id === id);
