export type WorkspaceSetupChecklistStepKey =
  | 'createAgent'
  | 'uploadKnowledgeBase'
  | 'testAgent'
  | 'createWorkflow'
  | 'connectChannel';

export type SetupChecklistRouteAgent = {
  _id: string;
  name: string;
};

type ResolveWorkspaceSetupChecklistActionArgs = {
  stepKey: WorkspaceSetupChecklistStepKey;
  agents: SetupChecklistRouteAgent[];
  selectedAgentId?: string;
};

export type WorkspaceSetupChecklistAction =
  | { kind: 'navigate'; to: string }
  | { kind: 'toast'; message: string };

const agentStepPaths = {
  uploadKnowledgeBase: 'knowledge-base/web',
  testAgent: 'agent-setup',
  createWorkflow: 'workflow',
  connectChannel: 'channels',
} satisfies Record<Exclude<WorkspaceSetupChecklistStepKey, 'createAgent'>, string>;

function resolveAgentId(args: ResolveWorkspaceSetupChecklistActionArgs) {
  if (args.selectedAgentId) return args.selectedAgentId;
  if (args.agents.length === 1) return args.agents[0]._id;
  return null;
}

export function resolveWorkspaceSetupChecklistAction(
  args: ResolveWorkspaceSetupChecklistActionArgs,
): WorkspaceSetupChecklistAction {
  if (args.stepKey === 'createAgent') {
    return { kind: 'navigate', to: '/create-agent' };
  }

  if (args.agents.length === 0) {
    return { kind: 'navigate', to: '/create-agent' };
  }

  const agentId = resolveAgentId(args);
  if (agentId === null) {
    return { kind: 'toast', message: 'Please select agent to proceed' };
  }

  return {
    kind: 'navigate',
    to: `/dashboard/${agentId}/${agentStepPaths[args.stepKey]}`,
  };
}
