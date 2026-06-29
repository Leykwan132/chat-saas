import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type DbCtx = QueryCtx | MutationCtx;

export type CollectedFields = Record<string, string | number | boolean | null>;

export type BookingSlot = {
  startAt: number;
  endAt: number;
  assignedUserId: Id<"users">;
  assignedWorkosUserId: string;
  assignedDisplayName?: string;
};

export type RosterEntry = {
  schedule: Doc<"userSchedules">;
  shifts: Doc<"userShifts">[];
  timeOff: Doc<"userTimeOff">[];
  user: Doc<"users"> | null;
};

export type ServiceFieldType =
  | "text"
  | "number"
  | "select"
  | "boolean"
  | "date"
  | "time"
  | "phone";
