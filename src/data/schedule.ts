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
  slots: [],
};

export const dayThreeSchedule: ScheduleDay = {
  label: "Day 3",
  slots: [],
};

export const scheduleDays: ScheduleDay[] = [];
