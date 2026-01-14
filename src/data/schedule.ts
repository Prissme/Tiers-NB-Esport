import type { Division } from "./types";

export type ScheduleMatch = {
  teamAId: string;
  teamBId: string;
};

export type ScheduleSlot = {
  time: string;
  division: Division;
  matches: ScheduleMatch[];
};

export const dayTwoSchedule = {
  label: "Jour 2",
  note: "Format optimisé : 2 matchs par créneau pour garder un rythme fluide.",
  slots: [
    {
      time: "19:00",
      division: "D1",
      matches: [
        { teamAId: "bt", teamBId: "ltg" },
        { teamAId: "jl", teamBId: "bd" },
      ],
    },
    {
      time: "20:00",
      division: "D2",
      matches: [
        { teamAId: "kyr", teamBId: "lxr" },
        { teamAId: "nr", teamBId: "t2" },
      ],
    },
  ],
};
