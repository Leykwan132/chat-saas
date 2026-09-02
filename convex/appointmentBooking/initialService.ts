import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { DEFAULT_SERVICE_FIELDS } from "./fields";
import { listServices } from "./access";

export async function createInitialAppointmentService(
  ctx: MutationCtx,
  args: {
    agentId: Id<"agents">;
    creatorWorkosUserId: string;
    name: string;
    durationMinutes: number;
  },
) {
  const name = args.name.trim();
  if (!name) throw new Error("Service name is required");
  const services = await listServices(ctx, args.agentId);
  const now = Date.now();
  return await ctx.db.insert("appointmentServices", {
    agentId: args.agentId,
    name,
    isActive: true,
    sortOrder: services.length,
    durationMinutes: Math.max(5, Math.round(args.durationMinutes)),
    bufferMinutes: 0,
    fields: DEFAULT_SERVICE_FIELDS,
    timeSlotPolicy: "offer_slots",
    salesStyle: "neutral",
    assignmentStrategy: "balanced",
    assignedWorkosUserIds: [args.creatorWorkosUserId],
    autoAssignNewMembers: false,
    createdAt: now,
    updatedAt: now,
  });
}
