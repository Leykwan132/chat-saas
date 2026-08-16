import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { getZonedDayAndMinutes } from "../leadRouting/eligibility";
import { displayNameForUser, serviceTimeZone } from "./fields";
import type { BookingSlot, RosterEntry } from "./types";
import { advanceCalendarAvailabilityPreload } from "../calendarAvailabilityPreload";
import { loadAvailabilityRoster, type AvailabilityRosterEntry } from "./availabilityRoster";
import { entryAvailableForSlot } from "./availabilityEligibility";

export { isAssignedToService } from "./availabilityEligibility";

async function loadRoster(
  ctx: MutationCtx,
  args: {
    agentId: Id<"agents">;
    teamId: Id<"teams">;
    windowStartAt: number;
    windowEndAt: number;
  },
): Promise<AvailabilityRosterEntry[]> {
  const loaded = await loadAvailabilityRoster(ctx, args);
  if (loaded.worker !== undefined) {
    await ctx.scheduler.runAfter(
      0,
      internal.appointmentBooking.availability.continueCalendarAvailabilityPreload,
      loaded.worker,
    );
  }
  return loaded.entries;
}

function chooseAssigneeForSlot(
  args: {
    service: Doc<"appointmentServices">;
    conversation?: Doc<"conversations">;
    teamId: Id<"teams">;
    entries: AvailabilityRosterEntry[];
    startAt: number;
    endAt: number;
    excludeEventId?: Id<"calendarEvents">;
    ignoreGoogleHealth?: boolean;
  },
): RosterEntry | null {
  const available: AvailabilityRosterEntry[] = [];
  for (const entry of args.entries) {
    if (entryAvailableForSlot({
      service: args.service, entry, startAt: args.startAt, endAt: args.endAt,
      excludeEventId: args.excludeEventId, ignoreGoogleHealth: args.ignoreGoogleHealth,
    })) {
      available.push(entry);
    }
  }
  if (available.length === 0) return null;

  if (args.service.assignmentStrategy === "specific_user") {
    return available.find((entry) => entry.schedule.workosUserId === args.service.specificWorkosUserId) ?? null;
  }

  const conversationOwnerWorkosUserId = args.conversation?.assignedUserId;
  if (args.service.assignmentStrategy === "conversation_owner" && conversationOwnerWorkosUserId) {
    const owner = available.find((entry) => entry.schedule.workosUserId === conversationOwnerWorkosUserId);
    if (owner) return owner;
  }

  if (args.service.assignmentStrategy === "round_robin") {
    const sorted = [...available].sort((a, b) => a.schedule.createdAt - b.schedule.createdAt);
    const ids = sorted.map((entry) => entry.schedule.workosUserId);
    const lastIndex = args.service.lastAssignedWorkosUserId ? ids.indexOf(args.service.lastAssignedWorkosUserId) : -1;
    return sorted[(lastIndex + 1) % sorted.length] ?? null;
  }

  const withCounts = available.map((entry) => ({
    entry,
    count: entry.futureAssignedEventCount,
  }));
  withCounts.sort((a, b) => {
    if (a.count !== b.count) return a.count - b.count;
    return a.entry.schedule.createdAt - b.entry.schedule.createdAt;
  });
  return withCounts[0]?.entry ?? null;
}

function roundUpToSlotInterval(time: number, intervalMinutes = 30) {
  const intervalMs = intervalMinutes * 60 * 1000;
  return Math.ceil(time / intervalMs) * intervalMs;
}

function sortSlotsWithPreferredTime(slots: BookingSlot[], service: Doc<"appointmentServices">) {
  const preferredTimeMinutes = service.preferredTimeMinutes;
  if (preferredTimeMinutes === undefined || preferredTimeMinutes.length === 0) {
    return slots;
  }

  const timeZone = serviceTimeZone(service);
  const used = new Set<number>();
  const sorted: BookingSlot[] = [];

  for (const preferredMinutes of preferredTimeMinutes) {
    for (const slot of slots) {
      if (used.has(slot.startAt)) continue;
      const { minutes } = getZonedDayAndMinutes(slot.startAt, timeZone);
      if (minutes === preferredMinutes) {
        sorted.push(slot);
        used.add(slot.startAt);
      }
    }
  }

  for (const slot of slots) {
    if (!used.has(slot.startAt)) {
      sorted.push(slot);
    }
  }

  return sorted;
}

export async function generateSlots(
  ctx: MutationCtx,
  args: {
    service: Doc<"appointmentServices">;
    conversation?: Doc<"conversations">;
    teamId: Id<"teams">;
    rangeStartAt: number;
    rangeEndAt: number;
    limit: number;
    prioritizePreferredTimes?: boolean;
    excludeEventId?: Id<"calendarEvents">;
    ignoreGoogleHealth?: boolean;
  },
): Promise<BookingSlot[]> {
  const durationMs = args.service.durationMinutes * 60 * 1000;
  const bufferMs = (args.service.bufferMinutes ?? 0) * 60 * 1000;
  const slots: BookingSlot[] = [];
  const firstStartAt = roundUpToSlotInterval(args.rangeStartAt);
  if (firstStartAt + durationMs > args.rangeEndAt) return [];
  const stopOnFilledLimit = args.prioritizePreferredTimes === false;
  const lastCandidateStartAt = stopOnFilledLimit
    ? args.rangeEndAt - durationMs
    : Math.min(args.rangeEndAt - durationMs, firstStartAt + 199 * 30 * 60 * 1000);
  const roster = await loadRoster(ctx, {
    agentId: args.service.agentId,
    teamId: args.teamId,
    windowStartAt: firstStartAt - bufferMs,
    windowEndAt: lastCandidateStartAt + durationMs + bufferMs,
  });
  let candidateCount = 0;
  for (
    let startAt = firstStartAt;
    startAt + durationMs <= args.rangeEndAt &&
    (stopOnFilledLimit ? slots.length < args.limit : candidateCount < 200);
    startAt += 30 * 60 * 1000
  ) {
    candidateCount += 1;
    const endAt = startAt + durationMs;
    const assignee = chooseAssigneeForSlot({
      service: args.service,
      conversation: args.conversation,
      teamId: args.teamId,
      entries: roster,
      startAt: startAt - bufferMs,
      endAt: endAt + bufferMs,
      excludeEventId: args.excludeEventId,
      ignoreGoogleHealth: args.ignoreGoogleHealth,
    });
    if (assignee?.user) {
      slots.push({
        startAt,
        endAt,
        assignedUserId: assignee.user._id,
        assignedWorkosUserId: assignee.schedule.workosUserId,
        assignedDisplayName: displayNameForUser(assignee.user),
      });
    }
  }
  const orderedSlots = args.prioritizePreferredTimes === false
    ? slots
    : sortSlotsWithPreferredTime(slots, args.service);
  return orderedSlots.slice(0, args.limit);
}

export async function resolveAvailableInterval(
  ctx: MutationCtx,
  args: {
    service: Doc<"appointmentServices">;
    conversation?: Doc<"conversations">;
    teamId: Id<"teams">;
    startAt: number;
    endAt: number;
    ignoreGoogleHealth?: boolean;
    logUnavailableReason?: boolean;
  },
): Promise<BookingSlot | null> {
  if (args.endAt <= args.startAt) return null;
  const bufferMs = (args.service.bufferMinutes ?? 0) * 60 * 1000;
  const entries = await loadRoster(ctx, {
    agentId: args.service.agentId,
    teamId: args.teamId,
    windowStartAt: args.startAt - bufferMs,
    windowEndAt: args.endAt + bufferMs,
  });
  const assignee = chooseAssigneeForSlot({
    service: args.service,
    conversation: args.conversation,
    teamId: args.teamId,
    entries,
    startAt: args.startAt - bufferMs,
    endAt: args.endAt + bufferMs,
    ignoreGoogleHealth: args.ignoreGoogleHealth,
  });
  if (assignee?.user === undefined || assignee.user === null) return null;
  return {
    startAt: args.startAt,
    endAt: args.endAt,
    assignedUserId: assignee.user._id,
    assignedWorkosUserId: assignee.schedule.workosUserId,
    assignedDisplayName: displayNameForUser(assignee.user),
  };
}

export const continueCalendarAvailabilityPreload = internalMutation({
  args: {
    preloadId: v.id("calendarAvailabilityPreloads"),
    generation: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await advanceCalendarAvailabilityPreload(ctx, { ...args, now: Date.now() });
    if (result.continue && result.worker !== undefined) {
      await ctx.scheduler.runAfter(
        0,
        internal.appointmentBooking.availability.continueCalendarAvailabilityPreload,
        result.worker,
      );
    }
    return null;
  },
});
