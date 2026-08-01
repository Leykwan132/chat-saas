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
