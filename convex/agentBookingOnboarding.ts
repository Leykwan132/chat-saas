import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { createInitialAppointmentService } from "./appointmentBooking/initialService";
import { ensureUserScheduleForAgent } from "./leadRouting/schedules";
import { replaceScheduleShifts, type ScheduleShiftInput } from "./leadRouting/shiftStore";
import { ensureWorkflowForAgent } from "./workflowCore";
import { createInitialBookingWorkflowAction } from "./workflowInitialBookingAction";
import { refreshWorkflowNodeReadinessForAgent } from "./workflowNodeReadiness";

export type BookingOnboardingInput = {
  availability: { timezone: string; shifts: ScheduleShiftInput[] };
  service?: {
    name: string;
    durationMinutes: number;
    appointmentBookingEnabled: boolean;
  };
};

export async function applyAgentBookingOnboarding(
  ctx: MutationCtx,
  args: {
    agent: Doc<"agents">;
    creatorWorkosUserId: string;
    bookingOnboarding?: BookingOnboardingInput;
  },
) {
  const scheduleId = await ensureUserScheduleForAgent(ctx, {
    agentId: args.agent._id,
    workosUserId: args.creatorWorkosUserId,
    timezone: args.bookingOnboarding?.availability.timezone,
    enabled: true,
  });
  const onboarding = args.bookingOnboarding;
  if (onboarding === undefined) return;
  await replaceScheduleShifts(ctx, scheduleId, onboarding.availability.shifts);
  if (onboarding.service === undefined) return;
  const serviceId = await createInitialAppointmentService(ctx, {
    agentId: args.agent._id,
    creatorWorkosUserId: args.creatorWorkosUserId,
    name: onboarding.service.name,
    durationMinutes: onboarding.service.durationMinutes,
  });
  const workflow = await ensureWorkflowForAgent(ctx, args.agent);
  if (onboarding.service.appointmentBookingEnabled) {
    await createInitialBookingWorkflowAction(ctx, { workflowId: workflow._id, serviceId });
  }
  await refreshWorkflowNodeReadinessForAgent(ctx, args.agent._id);
}
