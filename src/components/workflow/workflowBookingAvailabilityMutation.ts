import type { Id } from '../../../convex/_generated/dataModel';
import type {
  WorkflowAvailabilityRosterEntry,
  WorkflowAvailabilityTeammate,
} from './workflowBookingAvailabilityModel';

type SetWorkflowAcceptingLeadsArgs = {
  agentId: Id<'agents'>;
  teammate: WorkflowAvailabilityTeammate;
  rosterByUserId: Map<string, WorkflowAvailabilityRosterEntry>;
  enabled: boolean;
  addUser: (args: {
    agentId: Id<'agents'>;
    workosUserId: string;
  }) => Promise<Id<'userSchedules'>>;
  updateUser: (args: {
    userScheduleId: Id<'userSchedules'>;
    enabled: boolean;
  }) => Promise<unknown>;
};

type WorkflowAvailabilityToggleArgs = SetWorkflowAcceptingLeadsArgs & {
  setPending: (pending: boolean) => void;
  notify: {
    loading: (message: string) => string | number;
    success: (message: string, toastId: string | number) => void;
    error: (message: string, toastId: string | number) => void;
  };
};

export async function setWorkflowAcceptingLeads({
  agentId,
  teammate,
  rosterByUserId,
  enabled,
  addUser,
  updateUser,
}: SetWorkflowAcceptingLeadsArgs) {
  const scheduleId =
    rosterByUserId.get(teammate.workosUserId)?.schedule._id ??
    (await addUser({ agentId, workosUserId: teammate.workosUserId }));
  await updateUser({ userScheduleId: scheduleId, enabled });
}

export async function runWorkflowAvailabilityToggle({
  setPending,
  notify,
  ...toggleArgs
}: WorkflowAvailabilityToggleArgs) {
  setPending(true);
  const toastId = notify.loading(
    toggleArgs.enabled
      ? 'Turning on availability…'
      : 'Turning off availability…',
  );
  try {
    await setWorkflowAcceptingLeads(toggleArgs);
    notify.success(
      toggleArgs.enabled ? 'Availability turned on' : 'Availability turned off',
      toastId,
    );
  } catch (error) {
    notify.error(error instanceof Error ? error.message : 'Update failed', toastId);
  } finally {
    setPending(false);
  }
}
