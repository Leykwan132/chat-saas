import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";
import {
  DEFAULT_TEAM_TIME_ZONE,
  getActiveTeamForUser,
  getTeamByWorkosOrgId,
  getUserByWorkosId,
  normalizeTimeZone,
} from "./teamHelpers";
import { formatCalendarDateTime } from "./calendarFormatUtils";
import { getOwnedAgent } from "./leadRouting/helpers";
import { getLinkedInboxConversationDocs } from "./conversations";
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

function mergeCollectedFields(
  sessionFields: CollectedFields,
  incomingFields?: CollectedFields,
): CollectedFields {
  return {
    ...sessionFields,
    ...(incomingFields ?? {}),
  };
}

function bookingDisplayName(fields: CollectedFields) {
  if (typeof fields.name === "string" && fields.name.trim()) {
    return fields.name.trim();
  }
  return "Customer";
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

function formatCollectedFieldValue(value: string | number | boolean | null | undefined) {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).trim();
}

function formatBookingDateTime(startAt: number, endAt: number, timeZone: string) {
  return formatCalendarDateTime(startAt, endAt, timeZone);
}

function serviceSnapshot(service: Doc<"autoBookingServices">) {
  return {
    serviceId: service._id,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    fields: service.fields,
    preferredTimeMinutes: service.preferredTimeMinutes,
    salesStyle: service.salesStyle,
    timeZone: service.timeZone?.trim() || DEFAULT_TEAM_TIME_ZONE,
  };
}

async function getActiveSession(ctx: MutationCtx, conversationId: Id<"conversations">) {
  const sessions = await ctx.db
    .query("autoBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .collect();
  return sessions.find((session) => isActiveAutoBookingSessionStatus(session.status));
}

async function getLatestBookedSession(ctx: DbCtx, conversationId: Id<"conversations">) {
  const sessions = await ctx.db
    .query("autoBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .collect();
  return sessions
    .filter(
      (session) =>
        session.status === AutoBookingSessionStatus.Booked &&
        session.calendarEventId !== undefined,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

async function listActiveBookingServicesForAgent(ctx: DbCtx, agentId: Id<"agents">) {
  return (await listServices(ctx, agentId)).filter(
    (service) => service.isActive && service.archivedAt === undefined,
  );
}

async function resolveBookingService(
  ctx: DbCtx,
  agentId: Id<"agents">,
  serviceId?: Id<"autoBookingServices">,
) {
  const services = await listActiveBookingServicesForAgent(ctx, agentId);
  if (services.length === 0) {
    return { services, service: undefined as Doc<"autoBookingServices"> | undefined };
  }
  const service = serviceId
    ? services.find((row) => row._id === serviceId)
    : services.length === 1
      ? services[0]
      : undefined;
  return { services, service };
}

function serviceTimeZone(service: Pick<Doc<"autoBookingServices">, "timeZone">, team?: Pick<Doc<"teams">, "timeZone">) {
  return service.timeZone?.trim() || normalizeTimeZone(team?.timeZone);
}

function buildBookingConfirmationMessage(args: {
  service: Doc<"autoBookingServices">;
  collectedFields: CollectedFields;
  startAt: number;
  endAt: number;
  timeZone?: string;
  assignedTo?: string;
  bookingId: Id<"calendarEvents">;
  updated?: boolean;
}) {
  const { date, timeRange } = formatBookingDateTime(
    args.startAt,
    args.endAt,
    args.timeZone ?? args.service.timeZone ?? DEFAULT_TEAM_TIME_ZONE,
  );
  const detailLines = args.service.fields
    .map((field) => {
      const value = formatCollectedFieldValue(args.collectedFields[field.key]);
      if (!value) return undefined;
      return `${field.label}: ${value}`;
    })
    .filter((line): line is string => line !== undefined);

  const lines = [
    args.updated ? "Your booking has been updated!" : "Your booking is confirmed!",
    "",
    `Service: ${args.service.name}`,
    `Date: ${date}`,
    `Time: ${timeRange}`,
    ...detailLines.filter((line) => !line.startsWith("Booking Date:") && !line.startsWith("Booking Time:")),
    args.assignedTo ? `Team Member: ${args.assignedTo}` : undefined,
    `Booking reference: ${args.bookingId}`,
    "",
    "Thank you — we look forward to seeing you!",
  ].filter((line): line is string => line !== undefined);

  return lines.join("\n");
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
    defaultTimeZone: DEFAULT_TEAM_TIME_ZONE,
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
    defaultTimeZone: DEFAULT_TEAM_TIME_ZONE,
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
    excludeEventId?: Id<"calendarEvents">;
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
    if (
      event !== null &&
      event._id !== args.excludeEventId &&
      event.status !== "cancelled" &&
      overlaps(args.startAt, args.endAt, event.startAt, event.endAt)
    ) {
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
  excludeEventId?: Id<"calendarEvents">,
) {
  if (entry.user === null) return false;
  if (!isWithinShift(startAt, endAt, entry.schedule, entry.shifts)) return false;
  if (hasTimeOffOverlap(startAt, endAt, entry.timeOff)) return false;
  return !(await hasCalendarConflict(ctx, {
    teamId,
    userId: entry.user._id,
    startAt,
    endAt,
    excludeEventId,
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
    excludeEventId?: Id<"calendarEvents">;
  },
): Promise<RosterEntry | null> {
  const available: RosterEntry[] = [];
  for (const entry of args.entries) {
    if (
      await entryAvailableForSlot(
        ctx,
        args.teamId,
        entry,
        args.startAt,
        args.endAt,
        args.excludeEventId,
      )
    ) {
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

async function generateSlots(
  ctx: MutationCtx,
  args: {
    service: Doc<"autoBookingServices">;
    conversation: Doc<"conversations">;
    teamId: Id<"teams">;
    rangeStartAt: number;
    rangeEndAt: number;
    limit: number;
    excludeEventId?: Id<"calendarEvents">;
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
      excludeEventId: args.excludeEventId,
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
    return customer;
  }

  const now = Date.now();
  const service = conversation.service === "playground" ? "manual" : conversation.service;
  const customerId = await ctx.db.insert("customers", {
    orgId: conversation.orgId,
    service,
    contactAddress: conversation.contactAddress,
    name: typeof fields.name === "string" ? fields.name.trim() || undefined : undefined,
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
    bookingDisplayName: string;
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
    displayName: args.bookingDisplayName,
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

async function deleteCalendarParticipants(ctx: MutationCtx, eventId: Id<"calendarEvents">) {
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(100);
  for (const participant of participants) {
    await ctx.db.delete(participant._id);
  }
}

async function replaceCalendarParticipants(
  ctx: MutationCtx,
  args: {
    eventId: Id<"calendarEvents">;
    teamId: Id<"teams">;
    customer: Doc<"customers">;
    assignedUser: Doc<"users">;
    bookingDisplayName: string;
    eventStartAt: number;
    now: number;
  },
) {
  await deleteCalendarParticipants(ctx, args.eventId);
  await insertCalendarParticipants(ctx, args);
}

async function getExistingBookingSession(ctx: DbCtx, conversationId: Id<"conversations">) {
  const sessions = await ctx.db
    .query("autoBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .collect();
  return sessions
    .filter(
      (session) =>
        session.calendarEventId !== undefined &&
        (session.status === AutoBookingSessionStatus.Booked ||
          session.status === AutoBookingSessionStatus.Editing),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

function formatBookingDetailsResponse(args: {
  session: Doc<"autoBookingSessions">;
  service: Doc<"autoBookingServices">;
  event: Doc<"calendarEvents">;
  timeZone?: string;
  assignedTo?: string;
}) {
  const { date, timeRange } = formatBookingDateTime(
    args.event.startAt,
    args.event.endAt,
    args.timeZone ?? args.service.timeZone ?? DEFAULT_TEAM_TIME_ZONE,
  );
  return {
    bookingId: args.event._id,
    sessionId: args.session._id,
    status: args.session.status,
    service: serviceSnapshot(args.service),
    collectedFields: args.session.collectedFields,
    startAt: args.event.startAt,
    endAt: args.event.endAt,
    date,
    timeRange,
    teamMember: args.assignedTo,
    remarks: args.event.remarks,
  };
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
    if (args.defaultTimeZone !== undefined) patch.defaultTimeZone = normalizeTimeZone(args.defaultTimeZone);
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
    const agent = await ctx.db.get(args.agentId);
    const team = agent ? await resolveTeamForAgent(ctx, agent) : undefined;
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
          timeZone: serviceTimeZone(service, team),
        })),
    };
  },
});

async function loadActiveBookingDetailsForConversation(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
) {
  const session = await getExistingBookingSession(ctx, conversationId);
  if (session === undefined || session.calendarEventId === undefined || session.serviceId === undefined) {
    return null;
  }

  const [event, service] = await Promise.all([
    ctx.db.get(session.calendarEventId),
    ctx.db.get(session.serviceId),
  ]);
  if (event === null || service === null || event.status === "cancelled") {
    return null;
  }

  const team = await ctx.db.get(event.teamId);
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
    .take(20);
  const assigned = participants.find((row) => row.role === "assigned");

  return formatBookingDetailsResponse({
    session,
    service,
    event,
    timeZone: serviceTimeZone(service, team ?? undefined),
    assignedTo: assigned?.displayName ?? assigned?.email,
  });
}

async function assertConversationBookingRead(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
) {
  const { orgId } = await getAuthContext(ctx);
  const conv = await ctx.db.get(conversationId);
  if (conv === null || conv.orgId !== orgId) {
    return null;
  }
  const permissions = await permissionsForCurrentUser(ctx);
  if (!permissions.includes(Permission.CHATS_READ)) {
    throw new Error("Forbidden");
  }
  return conv;
}

async function conversationHasActiveBooking(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
) {
  const session = await getExistingBookingSession(ctx, conversationId);
  if (session === undefined || session.calendarEventId === undefined) {
    return false;
  }
  const event = await ctx.db.get(session.calendarEventId);
  return event !== null && event.status !== "cancelled";
}

export const listActiveBookingConversationIdsForCurrentOrg = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) {
      return [];
    }
    const permissions = await permissionsForCurrentUser(ctx);
    if (!permissions.includes(Permission.CHATS_READ)) {
      throw new Error("Forbidden");
    }

    const { conversations } = await getLinkedInboxConversationDocs(ctx, orgId);
    const ids: Id<"conversations">[] = [];
    for (const conv of conversations) {
      if (await conversationHasActiveBooking(ctx, conv._id)) {
        ids.push(conv._id);
      }
    }
    return ids;
  },
});

export const getCurrentBookingForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await assertConversationBookingRead(ctx, args.conversationId);
    if (conv === null) {
      return null;
    }
    return await loadActiveBookingDetailsForConversation(ctx, args.conversationId);
  },
});

export const getCurrentBooking = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const booking = await loadActiveBookingDetailsForConversation(ctx, args.conversationId);
    if (booking === null) {
      return { success: false, message: "No active booking found for this conversation." };
    }

    return {
      success: true,
      ...booking,
    };
  },
});

export const beginBookingEdit = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const active = await getActiveSession(ctx, args.conversationId);
    if (active !== undefined) {
      if (active.calendarEventId !== undefined) {
        return {
          success: true,
          sessionId: active._id,
          status: active.status,
          bookingId: active.calendarEventId,
          collectedFields: active.collectedFields,
          message: "Booking edit is already in progress.",
        };
      }
      return {
        success: false,
        message: "A new booking is already in progress. Cancel it first or finish it before editing an existing booking.",
      };
    }

    const session = await getExistingBookingSession(ctx, args.conversationId);
    if (session === undefined || session.calendarEventId === undefined || session.serviceId === undefined) {
      return { success: false, message: "No booking found to edit." };
    }

    const [event, service] = await Promise.all([
      ctx.db.get(session.calendarEventId),
      ctx.db.get(session.serviceId),
    ]);
    if (event === null || service === null || event.status === "cancelled") {
      return { success: false, message: "No active booking found to edit." };
    }

    const now = Date.now();
    await ctx.db.patch(session._id, {
      status: AutoBookingSessionStatus.Editing,
      updatedAt: now,
    });

    const team = await ctx.db.get(event.teamId);
    const participants = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .take(20);
    const assigned = participants.find((row) => row.role === "assigned");

    return {
      success: true,
      ...formatBookingDetailsResponse({
        session: { ...session, status: AutoBookingSessionStatus.Editing },
        service,
        event,
        timeZone: serviceTimeZone(service, team ?? undefined),
        assignedTo: assigned?.displayName ?? assigned?.email,
      }),
      message: "Booking edit started. Update details with startBookingSession, then checkAvailability if the time is changing, and call updateBookingAppointment after the customer confirms.",
    };
  },
});

export const startBookingSession = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.optional(v.id("autoBookingServices")),
    collectedFields: v.optional(collectedFieldsValidator),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }

    const { services, service } = await resolveBookingService(
      ctx,
      conversation.assignedAgentId,
      args.serviceId,
    );
    if (services.length === 0) {
      return {
        success: false,
        message: "No active auto-booking services are configured.",
      };
    }
    if (!service) {
      return {
        success: false,
        requiresServiceSelection: true,
        services: services.map((row) => ({
          serviceId: row._id,
          name: row.name,
          description: row.description,
          durationMinutes: row.durationMinutes,
        })),
        message: "Ask the customer which service they want before starting the booking session.",
      };
    }

    const now = Date.now();
    const session = await getOrCreateSession(ctx, conversation._id, conversation.assignedAgentId);
    const collectedFields = mergeCollectedFields(session.collectedFields, args.collectedFields);
    const missing = missingServiceFields(service, collectedFields);
    const isEditing = session.calendarEventId !== undefined;
    const nextStatus = isEditing
      ? AutoBookingSessionStatus.Editing
      : AutoBookingSessionStatus.Collecting;

    await ctx.db.patch(session._id, {
      serviceId: service._id,
      collectedFields,
      status: nextStatus,
      updatedAt: now,
    });

    return {
      success: true,
      sessionId: session._id,
      status: nextStatus,
      isEditing,
      bookingId: session.calendarEventId,
      service: serviceSnapshot(service),
      collectedFields,
      missingFields: missing,
      readyForAvailability: missing.length === 0,
      message:
        missing.length > 0
          ? `${isEditing ? "Booking edit in progress" : "Booking session started"}. Still collecting: ${missing.join(", ")}`
          : isEditing
            ? "Booking details updated. Check availability if the time changed, then call updateBookingAppointment after the customer confirms."
            : "Booking session started. All required details are collected — you can check availability next.",
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

    const session = await getActiveSession(ctx, conversation._id);
    if (session === undefined) {
      return {
        success: false,
        message: "No active booking session. Call startBookingSession first when the customer wants to book.",
        slots: [],
      };
    }

    const { services, service } = await resolveBookingService(
      ctx,
      conversation.assignedAgentId,
      args.serviceId ?? session.serviceId,
    );
    if (services.length === 0) {
      return { success: false, slots: [], message: "No active auto-booking services are configured." };
    }
    if (!service) {
      return {
        success: false,
        requiresServiceSelection: true,
        services: services.map((row) => ({
          serviceId: row._id,
          name: row.name,
          description: row.description,
          durationMinutes: row.durationMinutes,
        })),
        slots: [],
        message: "The booking session does not have a selected service yet.",
      };
    }
    if (session.serviceId !== undefined && session.serviceId !== service._id) {
      return {
        success: false,
        message: "The active booking session is for a different service. Cancel it or continue with the same service.",
        slots: [],
      };
    }

    const collectedFields = session.collectedFields;
    const missing = missingServiceFields(service, collectedFields);
    if (missing.length > 0) {
      return {
        success: false,
        status: AutoBookingSessionStatus.Collecting,
        service: serviceSnapshot(service),
        missingFields: missing,
        slots: [],
        message: `Still collecting booking details: ${missing.join(", ")}. Call startBookingSession with the new details.`,
      };
    }

    const team = await resolveTeamForAgent(ctx, agent);
    const now = Date.now();
    const rangeStartAt = Math.max(args.rangeStartAt ?? now + 60 * 60 * 1000, now);
    const rangeEndAt = args.preferredStartAt
      ? args.preferredStartAt + service.durationMinutes * 60 * 1000
      : args.rangeEndAt ?? rangeStartAt + 14 * 24 * 60 * 60 * 1000;
    const startAt = args.preferredStartAt ?? rangeStartAt;
    const limit = args.preferredStartAt ? 1 : 5;
    const isEditing = session.calendarEventId !== undefined;
    const slots = await generateSlots(ctx, {
      service,
      conversation,
      teamId: team._id,
      rangeStartAt: startAt,
      rangeEndAt,
      limit,
      excludeEventId: session.calendarEventId,
    });

    await ctx.db.patch(session._id, {
      serviceId: service._id,
      collectedFields,
      proposedSlots: slots,
      status: AutoBookingSessionStatus.Confirming,
      updatedAt: now,
    });

    return {
      success: true,
      isEditing,
      bookingId: session.calendarEventId,
      status: AutoBookingSessionStatus.Confirming,
      service: serviceSnapshot(service),
      slots,
      message: isEditing
        ? "Slots ready for the booking update. Call updateBookingAppointment after the customer confirms."
        : undefined,
    };
  },
});

export const sendBookingConfirmation = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const session = await getLatestBookedSession(ctx, args.conversationId);
    if (session === undefined || session.calendarEventId === undefined || session.serviceId === undefined) {
      return {
        success: false,
        message: "No completed booking found. Call bookAppointment first.",
      };
    }

    const [event, service] = await Promise.all([
      ctx.db.get(session.calendarEventId),
      ctx.db.get(session.serviceId),
    ]);
    if (event === null || service === null) {
      return {
        success: false,
        message: "Booking details could not be found.",
      };
    }

    const participants = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .take(20);
    const assigned = participants.find((row) => row.role === "assigned");

    const team = await ctx.db.get(event.teamId);
    const confirmationMessage = buildBookingConfirmationMessage({
      service,
      collectedFields: session.collectedFields,
      startAt: event.startAt,
      endAt: event.endAt,
      timeZone: serviceTimeZone(service, team ?? undefined),
      assignedTo: assigned?.displayName ?? assigned?.email,
      bookingId: event._id,
    });

    return {
      success: true,
      confirmationMessage,
      bookingId: event._id,
      serviceName: service.name,
      startAt: event.startAt,
      endAt: event.endAt,
    };
  },
});

export const sendBookingUpdateConfirmation = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const session = await getLatestBookedSession(ctx, args.conversationId);
    if (session === undefined || session.calendarEventId === undefined || session.serviceId === undefined) {
      return {
        success: false,
        message: "No updated booking found. Call updateBookingAppointment first.",
      };
    }

    const [event, service] = await Promise.all([
      ctx.db.get(session.calendarEventId),
      ctx.db.get(session.serviceId),
    ]);
    if (event === null || service === null) {
      return {
        success: false,
        message: "Booking details could not be found.",
      };
    }

    const participants = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .take(20);
    const assigned = participants.find((row) => row.role === "assigned");

    const team = await ctx.db.get(event.teamId);
    const confirmationMessage = buildBookingConfirmationMessage({
      service,
      collectedFields: session.collectedFields,
      startAt: event.startAt,
      endAt: event.endAt,
      timeZone: serviceTimeZone(service, team ?? undefined),
      assignedTo: assigned?.displayName ?? assigned?.email,
      bookingId: event._id,
      updated: true,
    });

    return {
      success: true,
      confirmationMessage,
      bookingId: event._id,
      serviceName: service.name,
      startAt: event.startAt,
      endAt: event.endAt,
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

    if (
      active.calendarEventId !== undefined &&
      (active.status === AutoBookingSessionStatus.Editing ||
        active.status === AutoBookingSessionStatus.Confirming)
    ) {
      await ctx.db.patch(active._id, {
        status: AutoBookingSessionStatus.Booked,
        updatedAt: Date.now(),
      });
      return {
        success: true,
        message: "Booking edit cancelled. The original booking is unchanged.",
      };
    }

    await ctx.db.patch(active._id, {
      status: AutoBookingSessionStatus.Cancelled,
      updatedAt: Date.now(),
    });
    return { success: true, message: "Booking cancelled." };
  },
});

export const updateBookingAppointment = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("autoBookingServices"),
    startAt: v.number(),
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
    const session = await getActiveSession(ctx, conversation._id);
    if (session === undefined || session.calendarEventId === undefined) {
      return {
        success: false,
        message: "No booking edit in progress. Call beginBookingEdit first.",
      };
    }
    if (session.serviceId !== undefined && session.serviceId !== service._id) {
      return {
        success: false,
        message: "The active booking edit is for a different service.",
      };
    }

    const event = await ctx.db.get(session.calendarEventId);
    if (event === null || event.status === "cancelled") {
      return { success: false, message: "The booking to update could not be found." };
    }

    const collectedFields = session.collectedFields;
    const missing = missingServiceFields(service, collectedFields);
    if (missing.length > 0) {
      return {
        success: false,
        missingFields: missing,
        message: `Missing required booking details: ${missing.join(", ")}. Call startBookingSession with the missing details.`,
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
      excludeEventId: session.calendarEventId,
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
    const attendeeName = bookingDisplayName(collectedFields);
    const bookingTimeZone = serviceTimeZone(service, team);
    await ctx.db.patch(event._id, {
      title: `${service.name} - ${attendeeName}`,
      description: service.description,
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      timeZone: bookingTimeZone,
      customFieldResponses: collectedFields,
      updatedAt: now,
    });
    await replaceCalendarParticipants(ctx, {
      eventId: event._id,
      teamId: team._id,
      customer,
      assignedUser,
      bookingDisplayName: attendeeName,
      eventStartAt: selectedSlot.startAt,
      now,
    });
    await ctx.db.patch(session._id, {
      serviceId: service._id,
      status: AutoBookingSessionStatus.Booked,
      collectedFields,
      selectedSlot,
      calendarEventId: event._id,
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
      bookingId: event._id,
      serviceName: service.name,
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      assignedTo: selectedSlot.assignedDisplayName ?? assignedUser.email,
      message: "Booking updated. Call sendBookingUpdateConfirmation next and send the returned confirmation message to the customer.",
    };
  },
});

export const bookAppointment = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("autoBookingServices"),
    startAt: v.number(),
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
    const session = await getActiveSession(ctx, conversation._id);
    if (session === undefined) {
      return {
        success: false,
        message: "No active booking session. Call startBookingSession first.",
      };
    }
    if (session.calendarEventId !== undefined) {
      return {
        success: false,
        message: "This session is editing an existing booking. Call updateBookingAppointment instead of bookAppointment.",
      };
    }
    if (session.serviceId !== undefined && session.serviceId !== service._id) {
      return {
        success: false,
        message: "The active booking session is for a different service.",
      };
    }
    const collectedFields = session.collectedFields;
    const missing = missingServiceFields(service, collectedFields);
    if (missing.length > 0) {
      return {
        success: false,
        missingFields: missing,
        message: `Missing required booking details: ${missing.join(", ")}. Call startBookingSession with the missing details.`,
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
    const attendeeName = bookingDisplayName(collectedFields);
    const bookingTimeZone = serviceTimeZone(service, team);
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId: team._id,
      title: `${service.name} - ${attendeeName}`,
      description: service.description,
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      timeZone: bookingTimeZone,
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
      bookingDisplayName: attendeeName,
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
      message: "Booking created. Call sendBookingConfirmation next and send the returned confirmation message to the customer.",
    };
  },
});
