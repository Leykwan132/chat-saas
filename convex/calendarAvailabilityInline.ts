import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  loadIndexedUserAvailability,
  type PreloadedUserAvailability,
} from "./calendarAvailabilityPreload";
import { indexLegacyParticipantAvailability } from "./calendarAvailabilityIntervals";

const INLINE_USER_LIMIT = 4;
const INLINE_LEGACY_REPAIR_BUDGET = 128;

export async function loadInlineCalendarAvailability(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    userIds: Id<"users">[];
    startAt: number;
    endAt: number;
    now: number;
  },
): Promise<Map<Id<"users">, PreloadedUserAvailability> | null> {
  if (args.userIds.length > INLINE_USER_LIMIT) return null;
  let remainingRepairBudget = INLINE_LEGACY_REPAIR_BUDGET;
  for (const userId of args.userIds) {
    const legacy = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_teamId_and_role_and_userId_and_availabilityIndexedAt", (q) => q
        .eq("teamId", args.teamId).eq("role", "assigned").eq("userId", userId)
        .eq("availabilityIndexedAt", undefined))
      .take(remainingRepairBudget + 1);
    for (const participant of legacy.slice(0, remainingRepairBudget)) {
      await indexLegacyParticipantAvailability(ctx, participant, args.now);
    }
    if (legacy.length > remainingRepairBudget) return null;
    remainingRepairBudget -= legacy.length;
  }
  const loaded = new Map(await Promise.all(args.userIds.map(async (userId) => [
    userId,
    await loadIndexedUserAvailability(ctx, { ...args, userId }),
  ] as const)));
  const ownerIds = [...new Set([...loaded.values()].flatMap((availability) =>
    availability.intervals.flatMap((interval) =>
      interval.externalOwnerUserId === undefined ? [] : [interval.externalOwnerUserId],
    ),
  ))];
  const eligibleOwners = new Set((await Promise.all(ownerIds.map(async (userId) => {
    const membership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId_and_teamId", (q) => q.eq("userId", userId).eq("teamId", args.teamId))
      .unique();
    return membership === null ? undefined : userId;
  }))).filter((userId): userId is Id<"users"> => userId !== undefined));
  return new Map([...loaded].map(([userId, availability]) => [userId, {
    safe: availability.safe,
    intervals: availability.intervals.filter((interval) =>
      interval.externalOwnerUserId === undefined || eligibleOwners.has(interval.externalOwnerUserId),
    ),
  }]));
}
