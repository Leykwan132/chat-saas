import type { Id } from '../../../convex/_generated/dataModel';

export function getAgentWorkspaceEntryPath(agentId: Id<'agents'>) {
  return `/dashboard/${agentId}/overview`;
}
