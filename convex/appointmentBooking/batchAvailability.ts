import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { AppointmentBookingBatchStatus } from "../appointmentBookingBatchStatus";
import { resolveTeamForAgent } from "./access";
import { resolveAvailableInterval } from "./availability";
import { formatAvailabilitySlotsForTool } from "./availabilityPresentation";
import { createOrReplaceActiveBatch, getActiveBookingState } from "./batchStore";
import { validateAvailabilityDates } from "./dateValidation";
import { serviceTimeZone } from "./fields";
import type { CollectedFields } from "./types";

const MIN_BATCH_SIZE = 2;
const MAX_BATCH_SIZE = 10;

export function missingBatchServiceFields(
  service: Doc<"appointmentServices">,
  fields: CollectedFields,
) {
  return service.fields
    .filter((field) => field.type !== "date" && field.type !== "time")
    .filter((field) => {
      const value = fields[field.key];
      return value === undefined || value === null ||
        (typeof value === "string" && value.trim().length === 0);
    })
    .map((field) => field.label);
}

function invalidInput(message: string) {
  return { success: false, allAvailable: false, requested: [], unavailable: [], message };
}

function hasOverlappingRequests(startAts: number[], durationMs: number) {
  const sorted = [...startAts].sort((a, b) => a - b);
  return sorted.some((startAt, index) =>
    index > 0 && startAt < sorted[index - 1]! + durationMs
  );
}

async function confirmationMessageId(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  agentMessageId?: string,
) {
  if (agentMessageId === undefined) return undefined;
  const message = await ctx.db
    .query("messages")
    .withIndex("by_agentMessageId", (q) => q.eq("agentMessageId", agentMessageId))
    .order("desc")
    .first();
  return message?.conversationId === conversationId && message.direction === "incoming"
    ? message._id
    : undefined;
}

export async function checkBatchAvailability(
  ctx: MutationCtx,
  args: {
    conversation: Doc<"conversations">;
    agent: Doc<"agents">;
    service: Doc<"appointmentServices">;
    preferredStartAts: number[];
    customerRequestAgentMessageId?: string;
  },
) {
  const starts = args.preferredStartAts;
  if (starts.length < MIN_BATCH_SIZE || starts.length > MAX_BATCH_SIZE) {
    return invalidInput("Request between 2 and 10 appointment times.");
  }
  if (starts.some((value) => !Number.isFinite(value))) {
    return invalidInput("Every appointment time must be valid.");
  }
  if (new Set(starts).size !== starts.length) {
    return invalidInput("Appointment times must be unique.");
  }
  const durationMs = args.service.durationMinutes * 60 * 1000;
  if (hasOverlappingRequests(starts, durationMs)) {
    return invalidInput("Requested appointment times must not overlap.");
  }
  const dateValidation = validateAvailabilityDates({
    now: Date.now(),
    timeZone: serviceTimeZone(args.service),
    preferredStartAts: starts,
  });
  if (dateValidation !== null) {
    return invalidInput(`Availability dates must be ${dateValidation.todayDate} or later.`);
  }
  const state = await getActiveBookingState(ctx, args.conversation._id);
  if (state?.kind === "single") {
    return invalidInput("Cancel or finish the active booking session before starting a batch.");
  }
  if (state?.kind === "batch" && state.row.serviceId !== undefined &&
      state.row.serviceId !== args.service._id) {
    return invalidInput("The active booking batch is for a different service.");
  }
  const team = await resolveTeamForAgent(ctx, args.agent);
  const slots = await Promise.all(starts.map((startAt) =>
    resolveAvailableInterval(ctx, {
      service: args.service,
      conversation: args.conversation,
      teamId: team._id,
      startAt,
      endAt: startAt + durationMs,
    })
  ));
  const unavailable = starts.filter((_, index) => slots[index] === null);
  const requested = starts.map((startAt, index) => ({
    startAt,
    endAt: startAt + durationMs,
    available: slots[index] !== null,
  }));
  if (unavailable.length > 0) {
    return { success: true, allAvailable: false, requested, unavailable };
  }
  const resolvedSlots = slots.filter((slot): slot is NonNullable<typeof slot> => slot !== null);
  const collectedFields = state?.kind === "batch" ? state.row.collectedFields : {};
  const confirmedMessageId = await confirmationMessageId(
    ctx,
    args.conversation._id,
    args.customerRequestAgentMessageId,
  );
  const batch = await createOrReplaceActiveBatch(ctx, {
    conversationId: args.conversation._id,
    agentId: args.agent._id,
    serviceId: args.service._id,
    collectedFields,
    requestedSlots: resolvedSlots,
    customerConfirmationMessageId: confirmedMessageId,
  });
  const missingFields = missingBatchServiceFields(args.service, collectedFields);
  const status = missingFields.length === 0 && confirmedMessageId !== undefined
    ? AppointmentBookingBatchStatus.Confirming
    : AppointmentBookingBatchStatus.Collecting;
  await ctx.db.patch(batch._id, { status, updatedAt: Date.now() });
  return {
    success: true,
    allAvailable: true,
    requested: formatAvailabilitySlotsForTool(resolvedSlots, serviceTimeZone(args.service)),
    unavailable: [],
    batchId: batch._id,
    status,
    missingFields,
    readyForBooking: status === AppointmentBookingBatchStatus.Confirming,
  };
}
