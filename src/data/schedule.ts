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

export type ScheduleDay = {
  label: string;
  note?: string;
  slots: ScheduleSlot[];
};

export const dayTwoSchedule: ScheduleDay = {
  label: "Day 2",
  slots: [
    {
      time: "19:00",
      division: "D1",
      matches: [
        { teamAId: "ltg", teamBId: "jl" },
        { teamAId: "bd", teamBId: "bt" },
      ],
    },
    {
      time: "20:00",
      division: "D2",
      matches: [
        { teamAId: "kyr", teamBId: "nr" },
        { teamAId: "lxr", teamBId: "t2" },
      ],
    },
  ],
};

export const dayThreeSchedule: ScheduleDay = {
  label: "Day 3",
  slots: [],
};

export const scheduleDays = [dayTwoSchedule, dayThreeSchedule];
