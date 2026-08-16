import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { displayNameForUser } from "./fields";
import type { CollectedFields } from "./types";
import { customerSearchText } from "../customerSearch";
import {
  removeParticipantAvailabilityIntervals,
  syncCalendarEventAvailabilityIntervals,
} from "../calendarAvailabilityIntervals";

export async function resolveCustomerForConversation(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  fields: CollectedFields,
) {
  if (conversation.customerId !== undefined) {
    const customer = await ctx.db.get(conversation.customerId);
    if (customer === null) {
      throw new Error("Customer not found");
    }
    return customer;
  }

  const now = Date.now();
  const service = conversation.service === "playground" ? "manual" : conversation.service;
  const name = typeof fields.name === "string" ? fields.name.trim() || undefined : undefined;
  const phone = typeof fields.phone === "string" ? fields.phone.trim() || undefined : undefined;
  const customerId = await ctx.db.insert("customers", {
    orgId: conversation.orgId,
    service,
    contactAddress: conversation.contactAddress,
    name,
    email: undefined,
    phone,
    searchText: customerSearchText({
      name,
      phone,
      contactAddress: conversation.contactAddress,
    }),
    tags: [],
    source: service,
    firstSeenAt: now,
    lastSeenAt: now,
    lastConversationId: conversation._id,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(conversation._id, { customerId, updatedAt: now });
  const customer = await ctx.db.get(customerId);
  if (customer === null) {
    throw new Error("Failed to create customer");
  }
  return customer;
}

export async function insertCalendarParticipants(
  ctx: MutationCtx,
  args: {
    eventId: Id<"calendarEvents">;
    teamId: Id<"teams">;
    customer: Doc<"customers">;
    assignedUser: Doc<"users">;
    bookingDisplayName: string;
    eventStartAt: number;
    eventEndAt: number;
    now: number;
  },
) {
  await ctx.db.insert("calendarEventParticipants", {
    eventId: args.eventId,
    teamId: args.teamId,
    participantType: "customer",
    role: "customer",
    customerId: args.customer._id,
    email: args.customer.email?.trim() || args.customer.contactAddress,
    displayName: args.bookingDisplayName,
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
    userId: args.assignedUser._id,
    email: args.assignedUser.email,
    displayName: displayNameForUser(args.assignedUser),
    eventStartAt: args.eventStartAt,
    eventEndAt: args.eventEndAt,
    responseStatus: "accepted",
    createdAt: args.now,
    updatedAt: args.now,
  });
  await syncCalendarEventAvailabilityIntervals(ctx, args.eventId, args.now);
}

async function deleteCalendarParticipants(ctx: MutationCtx, eventId: Id<"calendarEvents">) {
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(100);
  for (const participant of participants) {
    await removeParticipantAvailabilityIntervals(ctx, participant._id);
    await ctx.db.delete(participant._id);
  }
}

export async function replaceCalendarParticipants(
  ctx: MutationCtx,
  args: {
    eventId: Id<"calendarEvents">;
    teamId: Id<"teams">;
    customer: Doc<"customers">;
    assignedUser: Doc<"users">;
    bookingDisplayName: string;
    eventStartAt: number;
    eventEndAt: number;
    now: number;
  },
) {
  await deleteCalendarParticipants(ctx, args.eventId);
  await insertCalendarParticipants(ctx, args);
}
