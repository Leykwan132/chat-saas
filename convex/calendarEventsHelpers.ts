import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthContext } from "./authUtils";
import {
  Permission,
  ROLE_PERMISSIONS,
  resolvePermissionsForRole,
  type PermissionSlug,
} from "../shared/permissions";
import { removeParticipantAvailabilityIntervals } from "./calendarAvailabilityIntervals";

export type CollectedFields = Record<string, string | number | boolean | null>;

const collectedValueValidator = v.union(v.string(), v.number(), v.boolean(), v.null());
const eventStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("tentative"),
  v.literal("cancelled"),
);

export const calendarEventUpdateArgs = {
  eventId: v.id("calendarEvents"),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  location: v.optional(v.string()),
  link: v.optional(v.string()),
  startAt: v.optional(v.number()),
  endAt: v.optional(v.number()),
  timeZone: v.optional(v.string()),
  allDay: v.optional(v.boolean()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  status: v.optional(eventStatusValidator),
  customerId: v.optional(v.id("customers")),
  assignedUserId: v.optional(v.id("users")),
  attendeeUserIds: v.optional(v.array(v.id("users"))),
  customFieldResponses: v.optional(v.record(v.string(), collectedValueValidator)),
  remarks: v.optional(v.string()),
};

export type DbCtx = QueryCtx | MutationCtx;

export type ParticipantInput = {
  customerId: Id<"customers">;
  assignedUserId: Id<"users">;
  attendeeUserIds?: Id<"users">[];
};

export function bookingDisplayName(fields: CollectedFields) {
  if (typeof fields.name === "string" && fields.name.trim()) {
    return fields.name.trim();
  }
  return "Customer";
}

function userDisplayName(user: Doc<"users">) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email;
}

function customerDisplayName(customer: Doc<"customers">) {
  return (
    customer.name?.trim() ||
    customer.email?.trim() ||
    customer.phone?.trim() ||
    customer.contactAddress
  );
}

async function calendarPermissionsForCurrentUser(ctx: DbCtx): Promise<PermissionSlug[]> {
  const auth = await getAuthContext(ctx);
  const team = await ctx.db.get(auth.activeTeamId);
  if (team === null) {
    return [];
  }
  if (team.type === "personal") {
    return [Permission.CALENDAR_READ, Permission.CALENDAR_MANAGE];
  }

  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", auth.userDbId).eq("teamId", auth.activeTeamId),
    )
    .unique();
  if (membership === null) {
    return [];
  }

  const roleKey =
    membership.role === "owner"
      ? "owner"
      : membership.role === "admin"
        ? "admin"
        : "member";
  const stored: PermissionSlug[] =
    roleKey === "owner"
      ? ((team.ownerPermissions ?? [...ROLE_PERMISSIONS.owner]) as PermissionSlug[])
      : roleKey === "admin"
        ? ((team.adminPermissions ?? [...ROLE_PERMISSIONS.admin]) as PermissionSlug[])
        : ((team.memberPermissions ?? [...ROLE_PERMISSIONS.member]) as PermissionSlug[]);

  return resolvePermissionsForRole(roleKey, stored);
}

export async function assertCalendarAccess(ctx: DbCtx, permission: PermissionSlug) {
  const auth = await getAuthContext(ctx);
  const permissions = await calendarPermissionsForCurrentUser(ctx);
  if (!permissions.includes(permission)) {
    throw new Error("Forbidden");
  }
  return auth;
}

export async function assertTeamUser(ctx: DbCtx, teamId: Id<"teams">, userId: Id<"users">) {
  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", userId).eq("teamId", teamId),
    )
    .unique();
  if (membership === null) {
    throw new Error("Selected team member is not in this team");
  }
  const user = await ctx.db.get(userId);
  if (user === null) {
    throw new Error("Selected team member was not found");
  }
  return user;
}

export async function assertCustomerForActiveOrg(ctx: DbCtx, customerId: Id<"customers">) {
  const auth = await getAuthContext(ctx);
  const customer = await ctx.db.get(customerId);
  if (customer === null || customer.orgId !== auth.orgId) {
    throw new Error("Customer not found");
  }
  return customer;
}

export function validateTime(args: {
  startAt: number;
  endAt: number;
  allDay?: boolean;
  startDate?: string;
  endDate?: string;
}) {
  if (!Number.isFinite(args.startAt) || !Number.isFinite(args.endAt)) {
    throw new Error("Invalid event time");
  }
  if (args.endAt <= args.startAt) {
    throw new Error("Event end time must be after the start time");
  }
  if (args.allDay && (!args.startDate || !args.endDate)) {
    throw new Error("All-day events require start and end dates");
  }
}

export async function insertParticipants(
  ctx: MutationCtx,
  args: ParticipantInput & {
    eventId: Id<"calendarEvents">;
    teamId: Id<"teams">;
    eventStartAt: number;
    eventEndAt: number;
    now: number;
  },
) {
  const customer = await assertCustomerForActiveOrg(ctx, args.customerId);
  const assignedUser = await assertTeamUser(ctx, args.teamId, args.assignedUserId);

  await ctx.db.insert("calendarEventParticipants", {
    eventId: args.eventId,
    teamId: args.teamId,
    participantType: "customer",
    role: "customer",
    customerId: customer._id,
    email: customer.email?.trim() || customer.contactAddress,
    displayName: customerDisplayName(customer),
    eventStartAt: args.eventStartAt,
    eventEndAt: args.eventEndAt,
    responseStatus: "needsAction",
    createdAt: args.now,
    updatedAt: args.now,
  });

  await ctx.db.insert("calendarEventParticipants", {
    eventId: args.eventId,
    teamId: args.teamId,
    participantType: "teamUser",
    role: "assigned",
    userId: assignedUser._id,
    email: assignedUser.email,
    displayName: userDisplayName(assignedUser),
    eventStartAt: args.eventStartAt,
    eventEndAt: args.eventEndAt,
    responseStatus: "accepted",
    createdAt: args.now,
    updatedAt: args.now,
  });

  const uniqueAttendees = Array.from(
    new Set((args.attendeeUserIds ?? []).filter((id) => id !== args.assignedUserId)),
  );
  for (const attendeeUserId of uniqueAttendees) {
    const attendee = await assertTeamUser(ctx, args.teamId, attendeeUserId);
    await ctx.db.insert("calendarEventParticipants", {
      eventId: args.eventId,
      teamId: args.teamId,
      participantType: "teamUser",
      role: "attendee",
      userId: attendee._id,
      email: attendee.email,
      displayName: userDisplayName(attendee),
      eventStartAt: args.eventStartAt,
      eventEndAt: args.eventEndAt,
      responseStatus: "needsAction",
      createdAt: args.now,
      updatedAt: args.now,
    });
  }
}

export async function deleteParticipants(ctx: MutationCtx, eventId: Id<"calendarEvents">) {
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(100);
  for (const participant of participants) {
    await removeParticipantAvailabilityIntervals(ctx, participant._id);
    await ctx.db.delete(participant._id);
  }
}

async function getConversationIdByCustomerId(
  ctx: MutationCtx,
  customerId: Id<"customers">,
): Promise<Id<"conversations"> | undefined> {
  const conversation = await ctx.db
    .query("conversations")
    .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
    .first();
  return conversation?._id;
}

export async function getConversationIdForEvent(
  ctx: MutationCtx,
  event: Doc<"calendarEvents">,
): Promise<Id<"conversations"> | undefined> {
  if (event.conversationId) {
    return event.conversationId;
  }
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
    .take(50);
  const customerPart = participants.find((p) => p.role === "customer");
  if (customerPart?.customerId) {
    return await getConversationIdByCustomerId(ctx, customerPart.customerId);
  }
  return undefined;
}
