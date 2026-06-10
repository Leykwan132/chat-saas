import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";
import { getActiveTeamForUser, getTeamByWorkosOrgId, getUserByWorkosId } from "./teamHelpers";
import { getOwnedAgent } from "./leadRouting/helpers";
import { getZonedDayAndMinutes } from "./leadRouting/eligibility";
import {
  ALL_PERMISSION_SLUGS,
  Permission,
  ROLE_PERMISSIONS,
  resolvePermissionsForRole,
  type PermissionSlug,
} from "../shared/permissions";
import {
  AutoBookingSessionStatus,
  createEmptyAutoBookingSessionStatusCounts,
  isActiveAutoBookingSessionStatus,
} from "./autoBookingSessionStatus";

const serviceFieldValidator = v.object({
  key: v.string(),
  label: v.string(),
  type: v.union(
    v.literal("text"),
    v.literal("number"),
    v.literal("select"),
    v.literal("boolean"),
    v.literal("date"),
    v.literal("time"),
    v.literal("phone"),
  ),
  options: v.optional(v.array(v.string())),
});

const collectedValueValidator = v.union(v.string(), v.number(), v.boolean(), v.null());
const collectedFieldsValidator = v.record(v.string(), collectedValueValidator);

const timeSlotPolicyValidator = v.union(v.literal("offer_slots"), v.literal("customer_suggests"));
const salesStyleValidator = v.union(v.literal("proactive"), v.literal("neutral"), v.literal("gentle"));
const assignmentStrategyValidator = v.union(
  v.literal("conversation_owner"),
  v.literal("balanced"),
  v.literal("round_robin"),
  v.literal("specific_user"),
);

type DbCtx = QueryCtx | MutationCtx;
type CollectedFields = Record<string, string | number | boolean | null>;
type BookingSlot = {
  startAt: number;
  endAt: number;
  assignedUserId: Id<"users">;
  assignedWorkosUserId: string;
  assignedDisplayName?: string;
};
type RosterEntry = {
  schedule: Doc<"userSchedules">;
  shifts: Doc<"userShifts">[];
  timeOff: Doc<"userTimeOff">[];
  user: Doc<"users"> | null;
};

const DEFAULT_SERVICE_FIELDS = [
  { key: "date", label: "Booking Date", type: "date" as const, options: undefined },
  { key: "time", label: "Booking Time", type: "time" as const, options: undefined },
  { key: "name", label: "Customer Name", type: "text" as const, options: undefined },
  { key: "phone", label: "Phone Number", type: "phone" as const, options: undefined },
];

function displayNameForUser(user: Doc<"users">) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email;
}

function displayNameForCustomer(customer: Doc<"customers">) {
  return (
    customer.name?.trim() ||
    customer.email?.trim() ||
    customer.phone?.trim() ||
    customer.contactAddress
  );
}

function slugifyKey(input: string) {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `field_${Math.random().toString(36).slice(2, 8)}`;
}

type ServiceFieldType = "text" | "number" | "select" | "boolean" | "date" | "time" | "phone";

function normalizeServiceFields(fields: Array<{
  key?: string;
  label: string;
  type: ServiceFieldType;
  options?: string[];
}>) {
  const seen = new Set<string>();
  return fields
    .map((field) => {
      const label = field.label.trim();
      const baseKey = slugifyKey(field.key?.trim() || label);
      let key = baseKey;
      let suffix = 2;
      while (seen.has(key)) {
        key = `${baseKey}_${suffix}`;
        suffix += 1;
      }
      seen.add(key);
      return {
        key,
        label,
        type: field.type,
        options: field.type === "select"
          ? (field.options ?? []).map((option) => option.trim()).filter(Boolean)
          : undefined,
      };
    })
    .filter((field) => field.label.length > 0);
}

function isCollectedFieldValuePresent(value: string | number | boolean | null | undefined) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

async function enrichCollectedFieldsFromConversation(
  ctx: DbCtx,
  conversation: Doc<"conversations">,
  fields: CollectedFields,
) {
  const enriched: CollectedFields = { ...fields };

  if (conversation.customerId !== undefined) {
    const customer = await ctx.db.get(conversation.customerId);
    if (customer !== null) {
      if (!isCollectedFieldValuePresent(enriched.name) && customer.name?.trim()) {
        enriched.name = customer.name.trim();
      }
      if (!isCollectedFieldValuePresent(enriched.phone) && customer.phone?.trim()) {
        enriched.phone = customer.phone.trim();
      }
    }
  }

  if (!isCollectedFieldValuePresent(enriched.name) && conversation.contactName?.trim()) {
    enriched.name = conversation.contactName.trim();
  }

  return enriched;
}

function missingServiceFields(service: Doc<"autoBookingServices">, fields: CollectedFields) {
  const missing: string[] = [];
  for (const field of service.fields) {
    if (!isCollectedFieldValuePresent(fields[field.key])) {
      missing.push(field.label);
    }
  }
  return missing;
}

async function permissionsForCurrentUser(ctx: DbCtx): Promise<PermissionSlug[]> {
  const auth = await getAuthContext(ctx);
  const user = await ctx.db.get(auth.userDbId);
  if (user === null) return [];
  const team = await ctx.db.get(auth.activeTeamId);
  if (team === null) return [];
  if (team.type === "personal") {
    return [...ALL_PERMISSION_SLUGS];
  }
  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", user._id).eq("teamId", team._id),
    )
    .unique();
  if (membership === null) return [];
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

async function assertAutoBookingRead(ctx: DbCtx, agentId: Id<"agents">) {
  const agent = await getOwnedAgent(ctx, agentId);
  if (agent === null) {
    throw new Error("Agent not found");
  }
  const permissions = await permissionsForCurrentUser(ctx);
  if (!permissions.includes(Permission.AUTOMATION_READ) && !permissions.includes(Permission.CALENDAR_READ)) {
    throw new Error("Forbidden");
  }
  return agent;
}

async function assertAutoBookingManage(ctx: DbCtx, agentId: Id<"agents">) {
  const agent = await getOwnedAgent(ctx, agentId);
  if (agent === null) {
    throw new Error("Agent not found");
  }
  const permissions = await permissionsForCurrentUser(ctx);
  if (!permissions.includes(Permission.AUTOMATION_MANAGE) && !permissions.includes(Permission.CALENDAR_MANAGE)) {
    throw new Error("Forbidden");
  }
  return agent;
}

async function getOrCreateSettings(ctx: MutationCtx, agentId: Id<"agents">) {
  const existing = await ctx.db
    .query("autoBookingSettings")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .unique();
  if (existing !== null) return existing;
  const now = Date.now();
  const id = await ctx.db.insert("autoBookingSettings", {
    agentId,
    enabled: false,
    defaultTimeZone: "UTC",
    updatedAt: now,
  });
  const row = await ctx.db.get(id);
  if (row === null) {
    throw new Error("Failed to create auto booking settings");
  }
  return row;
}

async function getSettingsOrDefault(ctx: QueryCtx, agentId: Id<"agents">) {
  const existing = await ctx.db
    .query("autoBookingSettings")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .unique();
  return existing ?? {
    agentId,
    enabled: false,
    defaultTimeZone: "UTC",
    updatedAt: 0,
  };
}

async function listServices(ctx: DbCtx, agentId: Id<"agents">) {
  const services = await ctx.db
    .query("autoBookingServices")
    .withIndex("by_agentId_and_sortOrder", (q) => q.eq("agentId", agentId))
    .take(100);
  return services.filter((service) => service.archivedAt === undefined);
}

async function countBookingsByService(ctx: DbCtx, agentId: Id<"agents">) {
  const sessions = await ctx.db
    .query("autoBookingSessions")
    .withIndex("by_agentId_and_updatedAt", (q) => q.eq("agentId", agentId))
    .collect();

  const counts = new Map<Id<"autoBookingServices">, number>();
  for (const session of sessions) {
    if (session.serviceId === undefined || session.status !== AutoBookingSessionStatus.Booked) {
      continue;
    }
    const serviceId = session.serviceId;
    counts.set(serviceId, (counts.get(serviceId) ?? 0) + 1);
  }
  return counts;
}

async function loadService(ctx: DbCtx, serviceId: Id<"autoBookingServices">) {
  const service = await ctx.db.get(serviceId);
  if (service === null || service.archivedAt !== undefined) {
    throw new Error("Auto booking service not found");
  }
  return service;
}

async function resolveTeamForAgent(ctx: DbCtx, agent: Doc<"agents">) {
  if (agent.orgId && agent.orgId !== "personal") {
    const team = await getTeamByWorkosOrgId(ctx, agent.orgId);
    if (team !== null) return team;
  }
  const owner = await getUserByWorkosId(ctx, agent.userId);
  if (owner === null) {
    throw new Error("Agent owner not found");
  }
  return await getActiveTeamForUser(ctx, owner);
}

async function loadRoster(ctx: MutationCtx, agentId: Id<"agents">): Promise<RosterEntry[]> {
  const schedules = await ctx.db
    .query("userSchedules")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .take(100);
  const entries: RosterEntry[] = [];
  for (const schedule of schedules) {
    const shifts = await ctx.db
      .query("userShifts")
      .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", schedule._id))
      .take(100);
    const timeOff = await ctx.db
      .query("userTimeOff")
      .withIndex("by_userScheduleId", (q) => q.eq("userScheduleId", schedule._id))
      .take(100);
    const user = await getUserByWorkosId(ctx, schedule.workosUserId);
    entries.push({ schedule, shifts, timeOff, user });
  }
  return entries;
}

function isWithinShift(startAt: number, endAt: number, schedule: Doc<"userSchedules">, shifts: Doc<"userShifts">[]) {
  if (!schedule.enabled) return false;
  if (schedule.mode === "manual") {
    return schedule.manualStatus === "available";
  }
  const start = getZonedDayAndMinutes(startAt, schedule.timezone);
  const end = getZonedDayAndMinutes(Math.max(startAt, endAt - 1), schedule.timezone);
  if (start.dayOfWeek !== end.dayOfWeek) return false;
  return shifts.some(
    (shift) =>
      shift.dayOfWeek === start.dayOfWeek &&
      start.minutes >= shift.startMinutes &&
      end.minutes < shift.endMinutes,
  );
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function hasTimeOffOverlap(startAt: number, endAt: number, rows: Doc<"userTimeOff">[]) {
  return rows.some((row) => overlaps(startAt, endAt, row.startAt, row.endAt));
}

async function hasCalendarConflict(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    userId: Id<"users">;
    startAt: number;
    endAt: number;
  },
) {
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_teamId_and_role_and_userId_and_eventStartAt", (q) =>
      q
        .eq("teamId", args.teamId)
        .eq("role", "assigned")
        .eq("userId", args.userId)
        .gte("eventStartAt", args.startAt - 24 * 60 * 60 * 1000)
        .lt("eventStartAt", args.endAt),
    )
    .take(100);
  for (const participant of participants) {
    const event = await ctx.db.get(participant.eventId);
    if (event !== null && event.status !== "cancelled" && overlaps(args.startAt, args.endAt, event.startAt, event.endAt)) {
      return true;
    }
  }
  return false;
}

async function entryAvailableForSlot(
  ctx: MutationCtx,
  teamId: Id<"teams">,
  entry: RosterEntry,
  startAt: number,
  endAt: number,
) {
  if (entry.user === null) return false;
  if (!isWithinShift(startAt, endAt, entry.schedule, entry.shifts)) return false;
  if (hasTimeOffOverlap(startAt, endAt, entry.timeOff)) return false;
  return !(await hasCalendarConflict(ctx, {
    teamId,
    userId: entry.user._id,
    startAt,
    endAt,
  }));
}

async function countFutureAssignedEvents(ctx: MutationCtx, teamId: Id<"teams">, userId: Id<"users">, now: number) {
  const rows = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_teamId_and_role_and_userId_and_eventStartAt", (q) =>
      q
        .eq("teamId", teamId)
        .eq("role", "assigned")
        .eq("userId", userId)
        .gte("eventStartAt", now),
    )
    .take(100);
  return rows.length;
}

async function chooseAssigneeForSlot(
  ctx: MutationCtx,
  args: {
    service: Doc<"autoBookingServices">;
    conversation: Doc<"conversations">;
    teamId: Id<"teams">;
    entries: RosterEntry[];
    startAt: number;
    endAt: number;
  },
): Promise<RosterEntry | null> {
  const available: RosterEntry[] = [];
  for (const entry of args.entries) {
    if (await entryAvailableForSlot(ctx, args.teamId, entry, args.startAt, args.endAt)) {
      available.push(entry);
    }
  }
  if (available.length === 0) return null;

  if (args.service.assignmentStrategy === "specific_user") {
    return available.find((entry) => entry.schedule.workosUserId === args.service.specificWorkosUserId) ?? null;
  }

  if (args.service.assignmentStrategy === "conversation_owner" && args.conversation.assignedUserId) {
    const owner = available.find((entry) => entry.schedule.workosUserId === args.conversation.assignedUserId);
    if (owner) return owner;
  }

  if (args.service.assignmentStrategy === "round_robin") {
    const sorted = [...available].sort((a, b) => a.schedule.createdAt - b.schedule.createdAt);
    const ids = sorted.map((entry) => entry.schedule.workosUserId);
    const lastIndex = args.service.lastAssignedWorkosUserId
      ? ids.indexOf(args.service.lastAssignedWorkosUserId)
      : -1;
    return sorted[(lastIndex + 1) % sorted.length] ?? null;
  }

  const withCounts = [];
  for (const entry of available) {
    if (entry.user === null) continue;
    withCounts.push({
      entry,
      count: await countFutureAssignedEvents(ctx, args.teamId, entry.user._id, Date.now()),
    });
  }
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

function sortSlotsWithPreferredTime(
  slots: BookingSlot[],
  service: Doc<"autoBookingServices">,
) {
  const preferredTimeMinutes = service.preferredTimeMinutes;
  if (preferredTimeMinutes === undefined || preferredTimeMinutes.length === 0) {
    return slots;
  }

  const timeZone = service.timeZone?.trim() || "UTC";
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

async function generateSlots(
  ctx: MutationCtx,
  args: {
    service: Doc<"autoBookingServices">;
    conversation: Doc<"conversations">;
    teamId: Id<"teams">;
    rangeStartAt: number;
    rangeEndAt: number;
    limit: number;
  },
): Promise<BookingSlot[]> {
  const roster = await loadRoster(ctx, args.service.agentId);
  const durationMs = args.service.durationMinutes * 60 * 1000;
  const bufferMs = (args.service.bufferMinutes ?? 0) * 60 * 1000;
  const slots: BookingSlot[] = [];
  const maxCandidates = 200;
  for (
    let startAt = roundUpToSlotInterval(args.rangeStartAt);
    startAt + durationMs <= args.rangeEndAt && slots.length < maxCandidates;
    startAt += 30 * 60 * 1000
  ) {
    const endAt = startAt + durationMs;
    const assignee = await chooseAssigneeForSlot(ctx, {
      service: args.service,
      conversation: args.conversation,
      teamId: args.teamId,
      entries: roster,
      startAt: startAt - bufferMs,
      endAt: endAt + bufferMs,
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
  return sortSlotsWithPreferredTime(slots, args.service).slice(0, args.limit);
}

async function getOrCreateSession(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  agentId: Id<"agents">,
) {
  const sessions = await ctx.db
    .query("autoBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .collect();
  const active = sessions.find((session) => isActiveAutoBookingSessionStatus(session.status));
  if (active !== undefined) return active;
  const now = Date.now();
  const id = await ctx.db.insert("autoBookingSessions", {
    conversationId,
    agentId,
    status: AutoBookingSessionStatus.Collecting,
    collectedFields: {},
    createdAt: now,
    updatedAt: now,
  });
  const row = await ctx.db.get(id);
  if (row === null) {
    throw new Error("Failed to create booking session");
  }
  return row;
}

async function resolveCustomerForConversation(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  fields: CollectedFields,
) {
  if (conversation.customerId !== undefined) {
    const customer = await ctx.db.get(conversation.customerId);
    if (customer === null) {
      throw new Error("Customer not found");
    }
    const patch: Partial<Doc<"customers">> = { updatedAt: Date.now() };
    if (!customer.name && typeof fields.name === "string" && fields.name.trim()) {
      patch.name = fields.name.trim();
    }
    if (!customer.phone && typeof fields.phone === "string" && fields.phone.trim()) {
      patch.phone = fields.phone.trim();
    }
    if (Object.keys(patch).length > 1) {
      await ctx.db.patch(customer._id, patch);
    }
    return customer;
  }

  const now = Date.now();
  const service = conversation.service === "playground" ? "manual" : conversation.service;
  const customerId = await ctx.db.insert("customers", {
    orgId: conversation.orgId,
    service,
    contactAddress: conversation.contactAddress,
    name: typeof fields.name === "string" ? fields.name.trim() || undefined : conversation.contactName,
    email: undefined,
    phone: typeof fields.phone === "string" ? fields.phone.trim() || undefined : undefined,
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

async function insertCalendarParticipants(
  ctx: MutationCtx,
  args: {
    eventId: Id<"calendarEvents">;
    teamId: Id<"teams">;
    customer: Doc<"customers">;
    assignedUser: Doc<"users">;
    eventStartAt: number;
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
    displayName: displayNameForCustomer(args.customer),
    eventStartAt: args.eventStartAt,
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
    responseStatus: "accepted",
    createdAt: args.now,
    updatedAt: args.now,
  });
}

export const getOverview = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await assertAutoBookingRead(ctx, args.agentId);
    const settings = await getSettingsOrDefault(ctx, args.agentId);
    const services = await listServices(ctx, args.agentId);
    const bookingCounts = await countBookingsByService(ctx, args.agentId);
    const servicesWithMetrics = services.map((service) => ({
      ...service,
      bookingCount: bookingCounts.get(service._id) ?? 0,
    }));
    const enabled = services.some((service) => service.isActive);
    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("by_agentId_and_bookingSource_and_startAt", (q) =>
        q
          .eq("agentId", args.agentId)
          .eq("bookingSource", "ai")
          .gte("startAt", 0),
      )
      .order("desc")
      .take(100);

    const bookings = [];
    for (const event of events) {
      const participants = await ctx.db
        .query("calendarEventParticipants")
        .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
        .take(20);
      const assigned = participants.find((row) => row.role === "assigned");
      const customer = participants.find((row) => row.role === "customer");
      const service = event.autoBookingServiceId
        ? await ctx.db.get(event.autoBookingServiceId)
        : null;
      bookings.push({
        eventId: event._id,
        title: event.title,
        serviceName: service?.name ?? "Auto booking",
        customerName: customer?.displayName ?? customer?.email ?? "Customer",
        assignedName: assigned?.displayName ?? assigned?.email ?? "Unassigned",
        startAt: event.startAt,
        endAt: event.endAt,
        timeZone: event.timeZone,
        status: event.status,
        createdAt: event.createdAt,
      });
    }

    return { settings: { ...settings, enabled }, services: servicesWithMetrics, bookings };
  },
});

export const getServiceMetrics = query({
  args: { serviceId: v.id("autoBookingServices") },
  handler: async (ctx, args) => {
    const service = await loadService(ctx, args.serviceId);
    await assertAutoBookingRead(ctx, service.agentId);

    const sessions = await ctx.db
      .query("autoBookingSessions")
      .withIndex("by_agentId_and_updatedAt", (q) => q.eq("agentId", service.agentId))
      .collect();

    const counts = createEmptyAutoBookingSessionStatusCounts();

    for (const session of sessions) {
      if (session.serviceId !== args.serviceId) {
        continue;
      }
      counts[session.status] += 1;
    }

    return counts;
  },
});

export const updateSettings = mutation({
  args: {
    agentId: v.id("agents"),
    defaultTimeZone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAutoBookingManage(ctx, args.agentId);
    const settings = await getOrCreateSettings(ctx, args.agentId);
    const patch: Partial<Doc<"autoBookingSettings">> = { updatedAt: Date.now() };
    if (args.defaultTimeZone !== undefined) patch.defaultTimeZone = args.defaultTimeZone.trim() || "UTC";
    await ctx.db.patch(settings._id, patch);
  },
});

export const createService = mutation({
  args: {
    agentId: v.id("agents"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAutoBookingManage(ctx, args.agentId);
    const services = await listServices(ctx, args.agentId);
    const now = Date.now();
    return await ctx.db.insert("autoBookingServices", {
      agentId: args.agentId,
      name: args.name.trim() || "New service",
      isActive: true,
      sortOrder: services.length,
      durationMinutes: 30,
      bufferMinutes: 0,
      fields: DEFAULT_SERVICE_FIELDS,
      timeSlotPolicy: "offer_slots",
      salesStyle: "neutral",
      assignmentStrategy: "balanced",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateService = mutation({
  args: {
    serviceId: v.id("autoBookingServices"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    durationMinutes: v.optional(v.number()),
    bufferMinutes: v.optional(v.number()),
    timeZone: v.optional(v.string()),
    fields: v.optional(v.array(serviceFieldValidator)),
    timeSlotPolicy: v.optional(timeSlotPolicyValidator),
    preferredTimeMinutes: v.optional(v.union(v.array(v.number()), v.null())),
    salesStyle: v.optional(salesStyleValidator),
    assignmentStrategy: v.optional(assignmentStrategyValidator),
    specificWorkosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const service = await loadService(ctx, args.serviceId);
    await assertAutoBookingManage(ctx, service.agentId);
    const patch: Partial<Doc<"autoBookingServices">> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name.trim() || service.name;
    if (args.description !== undefined) patch.description = args.description.trim() || undefined;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    if (args.durationMinutes !== undefined) patch.durationMinutes = Math.max(5, Math.round(args.durationMinutes));
    if (args.bufferMinutes !== undefined) patch.bufferMinutes = Math.max(0, Math.round(args.bufferMinutes));
    if (args.timeZone !== undefined) patch.timeZone = args.timeZone.trim() || undefined;
    if (args.fields !== undefined) patch.fields = normalizeServiceFields(args.fields);
    if (args.preferredTimeMinutes !== undefined) {
      patch.preferredTimeMinutes =
        args.preferredTimeMinutes === null || args.preferredTimeMinutes.length === 0
          ? undefined
          : args.preferredTimeMinutes;
    }
    if (args.salesStyle !== undefined) patch.salesStyle = args.salesStyle;
    if (args.assignmentStrategy !== undefined) patch.assignmentStrategy = args.assignmentStrategy;
    if (args.specificWorkosUserId !== undefined) patch.specificWorkosUserId = args.specificWorkosUserId.trim() || undefined;
    await ctx.db.patch(service._id, patch);
  },
});

export const archiveService = mutation({
  args: { serviceId: v.id("autoBookingServices") },
  handler: async (ctx, args) => {
    const service = await loadService(ctx, args.serviceId);
    await assertAutoBookingManage(ctx, service.agentId);
    await ctx.db.patch(service._id, {
      isActive: false,
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const reorderServices = mutation({
  args: {
    agentId: v.id("agents"),
    serviceIds: v.array(v.id("autoBookingServices")),
  },
  handler: async (ctx, args) => {
    await assertAutoBookingManage(ctx, args.agentId);
    for (let i = 0; i < args.serviceIds.length; i += 1) {
      const service = await ctx.db.get(args.serviceIds[i]!);
      if (service !== null && service.agentId === args.agentId) {
        await ctx.db.patch(service._id, { sortOrder: i, updatedAt: Date.now() });
      }
    }
  },
});

export const internalIsEnabled = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("autoBookingServices")
      .withIndex("by_agentId_and_isActive", (q) =>
        q.eq("agentId", args.agentId).eq("isActive", true),
      )
      .take(1);
    return services.some((service) => service.archivedAt === undefined);
  },
});

export const listActiveServices = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("autoBookingServices")
      .withIndex("by_agentId_and_isActive", (q) => q.eq("agentId", args.agentId).eq("isActive", true))
      .take(50);
    const activeServices = services
      .filter((service) => service.archivedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      enabled: activeServices.length > 0,
      services: activeServices
        .map((service) => ({
          serviceId: service._id,
          name: service.name,
          description: service.description,
          durationMinutes: service.durationMinutes,
          fields: service.fields,
          preferredTimeMinutes: service.preferredTimeMinutes,
          salesStyle: service.salesStyle,
        })),
    };
  },
});

export const checkAvailability = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.optional(v.id("autoBookingServices")),
    preferredStartAt: v.optional(v.number()),
    rangeStartAt: v.optional(v.number()),
    rangeEndAt: v.optional(v.number()),
    collectedFields: v.optional(collectedFieldsValidator),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }
    const agent = await ctx.db.get(conversation.assignedAgentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }

    const services = (await listServices(ctx, conversation.assignedAgentId)).filter(
      (service) => service.isActive && service.archivedAt === undefined,
    );
    if (services.length === 0) {
      return { enabled: false, slots: [], message: "No active auto-booking services are configured." };
    }
    const service = args.serviceId
      ? services.find((row) => row._id === args.serviceId)
      : services.length === 1
        ? services[0]
        : undefined;
    if (!service) {
      return {
        enabled: true,
        requiresServiceSelection: true,
        services: services.map((row) => ({
          serviceId: row._id,
          name: row.name,
          description: row.description,
          durationMinutes: row.durationMinutes,
        })),
        slots: [],
      };
    }

    const team = await resolveTeamForAgent(ctx, agent);
    const now = Date.now();
    const session = await getOrCreateSession(ctx, conversation._id, conversation.assignedAgentId);
    const collectedFields = await enrichCollectedFieldsFromConversation(ctx, conversation, {
      ...session.collectedFields,
      ...(args.collectedFields ?? {}),
    });
    const missing = missingServiceFields(service, collectedFields);
    if (missing.length > 0) {
      await ctx.db.patch(session._id, {
        serviceId: service._id,
        collectedFields,
        status: AutoBookingSessionStatus.Collecting,
        updatedAt: now,
      });
      return {
        enabled: true,
        status: AutoBookingSessionStatus.Collecting,
        service: {
          serviceId: service._id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          preferredTimeMinutes: service.preferredTimeMinutes,
          salesStyle: service.salesStyle,
        },
        missingFields: missing,
        slots: [],
        message: `Still collecting booking details: ${missing.join(", ")}`,
      };
    }

    const rangeStartAt = Math.max(args.rangeStartAt ?? now + 60 * 60 * 1000, now);
    const rangeEndAt = args.preferredStartAt
      ? args.preferredStartAt + service.durationMinutes * 60 * 1000
      : args.rangeEndAt ?? rangeStartAt + 14 * 24 * 60 * 60 * 1000;
    const startAt = args.preferredStartAt ?? rangeStartAt;
    const limit = args.preferredStartAt ? 1 : 5;
    const slots = await generateSlots(ctx, {
      service,
      conversation,
      teamId: team._id,
      rangeStartAt: startAt,
      rangeEndAt,
      limit,
    });

    await ctx.db.patch(session._id, {
      serviceId: service._id,
      collectedFields,
      proposedSlots: slots,
      status: AutoBookingSessionStatus.Confirming,
      updatedAt: now,
    });

    return {
      enabled: true,
      status: AutoBookingSessionStatus.Confirming,
      service: {
        serviceId: service._id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        preferredTimeMinutes: service.preferredTimeMinutes,
        salesStyle: service.salesStyle,
      },
      slots,
    };
  },
});

export const cancelBookingSession = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("autoBookingSessions")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    const active = sessions.find((session) => isActiveAutoBookingSessionStatus(session.status));
    if (active === undefined) {
      return { success: false, message: "No active booking to cancel." };
    }

    await ctx.db.patch(active._id, {
      status: AutoBookingSessionStatus.Cancelled,
      updatedAt: Date.now(),
    });
    return { success: true, message: "Booking cancelled." };
  },
});

export const bookAppointment = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("autoBookingServices"),
    startAt: v.number(),
    collectedFields: v.optional(collectedFieldsValidator),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }
    const agent = await ctx.db.get(conversation.assignedAgentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== conversation.assignedAgentId || !service.isActive) {
      throw new Error("Selected service is not available");
    }
    const session = await getOrCreateSession(ctx, conversation._id, conversation.assignedAgentId);
    const collectedFields = await enrichCollectedFieldsFromConversation(ctx, conversation, {
      ...session.collectedFields,
      ...(args.collectedFields ?? {}),
    });
    const missing = missingServiceFields(service, collectedFields);
    if (missing.length > 0) {
      return {
        success: false,
        missingFields: missing,
        message: `Missing required booking details: ${missing.join(", ")}`,
      };
    }

    const team = await resolveTeamForAgent(ctx, agent);
    const slots = await generateSlots(ctx, {
      service,
      conversation,
      teamId: team._id,
      rangeStartAt: args.startAt,
      rangeEndAt: args.startAt + service.durationMinutes * 60 * 1000,
      limit: 1,
    });
    const selectedSlot = slots.find((slot) => slot.startAt === args.startAt);
    if (!selectedSlot) {
      return {
        success: false,
        message: "That slot is no longer available. Please check availability again.",
      };
    }
    const assignedUser = await ctx.db.get(selectedSlot.assignedUserId);
    if (assignedUser === null) {
      throw new Error("Assigned teammate not found");
    }
    const customer = await resolveCustomerForConversation(ctx, conversation, collectedFields);
    const now = Date.now();
    const customerName = displayNameForCustomer(customer);
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId: team._id,
      title: `${service.name} - ${customerName}`,
      description: service.description,
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      timeZone: service.timeZone ?? "UTC",
      status: "confirmed",
      createdBy: assignedUser._id,
      agentId: service.agentId,
      conversationId: conversation._id,
      autoBookingServiceId: service._id,
      bookingSource: "ai",
      customFieldResponses: collectedFields,
      createdAt: now,
      updatedAt: now,
    });
    await insertCalendarParticipants(ctx, {
      eventId,
      teamId: team._id,
      customer,
      assignedUser,
      eventStartAt: selectedSlot.startAt,
      now,
    });
    await ctx.db.patch(session._id, {
      serviceId: service._id,
      status: AutoBookingSessionStatus.Booked,
      collectedFields,
      selectedSlot,
      calendarEventId: eventId,
      updatedAt: now,
    });
    if (service.assignmentStrategy === "round_robin") {
      await ctx.db.patch(service._id, {
        lastAssignedWorkosUserId: selectedSlot.assignedWorkosUserId,
        lastAssignedAt: now,
        updatedAt: now,
      });
    }
    return {
      success: true,
      bookingId: eventId,
      serviceName: service.name,
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      assignedTo: selectedSlot.assignedDisplayName ?? assignedUser.email,
    };
  },
});
