import { v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { createEmptyAppointmentBookingSessionStatusCounts } from "../appointmentBookingSessionStatus";
import {
  assertAppointmentBookingManage,
  assertAppointmentBookingRead,
  countBookingsByService,
  listServices,
  loadService,
  resolveTeamForAgent,
} from "./access";
import {
  DEFAULT_SERVICE_FIELDS,
  normalizeServiceFields,
  serviceTimeZone,
} from "./fields";
import {
  assignmentStrategyValidator,
  salesStyleValidator,
  serviceFieldValidator,
  timeSlotPolicyValidator,
} from "./validators";
import { filterServicesByWorkflowBookingSelection } from "../workflowAppointmentServices";
import { refreshWorkflowNodeReadinessForAgent } from "../workflowNodeReadiness";
import { listTeamWorkosUserIds } from "./serviceAssignments";

export const getOverview = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await assertAppointmentBookingRead(ctx, args.agentId);
    const services = await listServices(ctx, args.agentId);
    const bookingCounts = await countBookingsByService(ctx, args.agentId);
    const servicesWithMetrics = services.map((service) => ({
      ...service,
      bookingCount: bookingCounts.get(service._id) ?? 0,
    }));
    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("by_agentId_and_bookingSource_and_startAt", (q) =>
        q.eq("agentId", args.agentId).eq("bookingSource", "ai").gte("startAt", 0),
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
      const service = event.appointmentServiceId
        ? await ctx.db.get(event.appointmentServiceId)
        : null;
      bookings.push({
        eventId: event._id,
        title: event.title,
        serviceName: service?.name ?? "Services",
        customerName: customer?.displayName ?? customer?.email ?? "Customer",
        assignedName: assigned?.displayName ?? assigned?.email ?? "Unassigned",
        startAt: event.startAt,
        endAt: event.endAt,
        timeZone: event.timeZone,
        status: event.status,
        createdAt: event.createdAt,
      });
    }

    return { services: servicesWithMetrics, bookings };
  },
});

export const getServiceMetrics = query({
  args: { serviceId: v.id("appointmentServices") },
  handler: async (ctx, args) => {
    const service = await loadService(ctx, args.serviceId);
    await assertAppointmentBookingRead(ctx, service.agentId);
    const sessions = await ctx.db
      .query("appointmentBookingSessions")
      .withIndex("by_agentId_and_updatedAt", (q) => q.eq("agentId", service.agentId))
      .take(500);
    const counts = createEmptyAppointmentBookingSessionStatusCounts();
    for (const session of sessions) {
      if (session.serviceId === args.serviceId) {
        counts[session.status] += 1;
      }
    }
    return counts;
  },
});

export const createService = mutation({
  args: { agentId: v.id("agents"), name: v.string() },
  handler: async (ctx, args) => {
    const agent = await assertAppointmentBookingManage(ctx, args.agentId);
    const services = await listServices(ctx, args.agentId);
    const assignedWorkosUserIds = await listTeamWorkosUserIds(ctx, agent);
    if (assignedWorkosUserIds.length === 0) {
      throw new Error("No teammates are available for this service");
    }
    const now = Date.now();
    const serviceId = await ctx.db.insert("appointmentServices", {
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
      assignedWorkosUserIds,
      createdAt: now,
      updatedAt: now,
    });
    await refreshWorkflowNodeReadinessForAgent(ctx, args.agentId);
    return serviceId;
  },
});

export const updateService = mutation({
  args: {
    serviceId: v.id("appointmentServices"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    locationMode: v.optional(v.union(
      v.literal("remote"),
      v.literal("video_call"),
      v.literal("in_person"),
    )),
    location: v.optional(v.string()),
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
    assignedWorkosUserIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const service = await loadService(ctx, args.serviceId);
    const agent = await assertAppointmentBookingManage(ctx, service.agentId);
    const teamWorkosUserIds = new Set(await listTeamWorkosUserIds(ctx, agent));
    const selectedWorkosUserIds = args.assignedWorkosUserIds
      ?? service.assignedWorkosUserIds
      ?? [...teamWorkosUserIds];
    const uniqueWorkosUserIds = [...new Set(selectedWorkosUserIds)];
    if (uniqueWorkosUserIds.length === 0) {
      throw new Error("Select at least one teammate");
    }
    if (uniqueWorkosUserIds.some((workosUserId) => !teamWorkosUserIds.has(workosUserId))) {
      throw new Error("Selected teammate is not part of this team");
    }
    const assignmentStrategy = args.assignmentStrategy ?? service.assignmentStrategy;
    const locationMode = args.locationMode ?? service.locationMode ?? "in_person";
    const specificWorkosUserId = args.specificWorkosUserId?.trim() || service.specificWorkosUserId;
    if (
      assignmentStrategy === "specific_user" &&
      (specificWorkosUserId === undefined || !uniqueWorkosUserIds.includes(specificWorkosUserId))
    ) {
      throw new Error("Select the specific teammate for this service");
    }
    const patch: Partial<Doc<"appointmentServices">> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name.trim() || service.name;
    if (args.description !== undefined) patch.description = args.description.trim() || undefined;
    if (args.locationMode !== undefined) patch.locationMode = args.locationMode;
    if (locationMode !== "in_person") {
      patch.location = undefined;
    } else if (args.location !== undefined) {
      patch.location = args.location.trim() || undefined;
    }
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
    patch.assignedWorkosUserIds = uniqueWorkosUserIds;
    await ctx.db.patch(service._id, patch);
    await refreshWorkflowNodeReadinessForAgent(ctx, service.agentId);
  },
});

export const archiveService = mutation({
  args: { serviceId: v.id("appointmentServices") },
  handler: async (ctx, args) => {
    const service = await loadService(ctx, args.serviceId);
    await assertAppointmentBookingManage(ctx, service.agentId);
    await ctx.db.patch(service._id, {
      isActive: false,
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });
    await refreshWorkflowNodeReadinessForAgent(ctx, service.agentId);
  },
});

export const reorderServices = mutation({
  args: {
    agentId: v.id("agents"),
    serviceIds: v.array(v.id("appointmentServices")),
  },
  handler: async (ctx, args) => {
    await assertAppointmentBookingManage(ctx, args.agentId);
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
      .query("appointmentServices")
      .withIndex("by_agentId_and_isActive", (q) => q.eq("agentId", args.agentId).eq("isActive", true))
      .take(50);
    const activeServices = services.filter((service) => service.archivedAt === undefined);
    const workflowAllowedServices = await filterServicesByWorkflowBookingSelection(ctx, args.agentId, activeServices);
    return workflowAllowedServices.length > 0;
  },
});

export const listActiveServices = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    const team = agent ? await resolveTeamForAgent(ctx, agent) : undefined;
    const services = await ctx.db
      .query("appointmentServices")
      .withIndex("by_agentId_and_isActive", (q) => q.eq("agentId", args.agentId).eq("isActive", true))
      .take(50);
    const activeServices = services
      .filter((service) => service.archivedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const workflowAllowedServices = await filterServicesByWorkflowBookingSelection(ctx, args.agentId, activeServices);
    return {
      enabled: workflowAllowedServices.length > 0,
      services: workflowAllowedServices.map((service) => ({
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
