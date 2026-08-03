export const WORKFLOW_NODE_KINDS = [
  'start',
  'answerQuestions',
  'aiResponds',
  'sendImage',
  'sendFile',
  'sendText',
  'closeConversation',
  'humanEscalation',
  'bookAppointment',
  'subagent',
  'say',
  'updateState',
  'agentTransfer',
  'phoneTransfer',
  'tool',
  'end',
] as const;

export type WorkflowNodeKind = (typeof WORKFLOW_NODE_KINDS)[number];

export const ADDABLE_WORKFLOW_NODE_KINDS = [
  'sendText',
  'sendImage',
  'sendFile',
  'bookAppointment',
  'humanEscalation',
  'closeConversation',
] as const;

export type AddableWorkflowNodeKind =
  (typeof ADDABLE_WORKFLOW_NODE_KINDS)[number];

export const WORKFLOW_CONDITION_EDGE_LABEL = 'Condition';

export const WORKFLOW_TERMINAL_NODE_KINDS = [
  'closeConversation',
  'humanEscalation',
  'end',
] as const satisfies readonly WorkflowNodeKind[];

export const WORKFLOW_ACTION_NODE_KINDS = [
  'answerQuestions',
  'sendText',
  'sendImage',
  'sendFile',
  'aiResponds',
  'bookAppointment',
  'humanEscalation',
] as const satisfies readonly WorkflowNodeKind[];

export const WORKFLOW_INITIALLY_READY_NODE_KINDS = [
  'closeConversation',
  'humanEscalation',
] as const satisfies readonly WorkflowNodeKind[];

export const WORKFLOW_NODE_META: Record<
  WorkflowNodeKind,
  { label: string; description?: string }
> = {
  start: {
    label: 'Message enters',
  },
  answerQuestions: {
    label: 'Q&A',
    description: 'Answer customer questions using only the knowledge base as the source of truth. If the knowledge base does not contain the answer, say so and ask a clarifying question instead of guessing.',
  },
  aiResponds: {
    label: 'Custom action',
  },
  sendImage: {
    label: 'Send Photo/Video',
    description: 'Send node-owned photos or videos to the customer when this condition matches.',
  },
  sendFile: {
    label: 'Send Files',
    description: 'Send node-owned files or documents to the customer when this condition matches.',
  },
  sendText: {
    label: 'Send message',
    description: 'Write the exact message the AI should send when this workflow condition matches.',
  },
  closeConversation: {
    label: 'Close conversation',
  },
  humanEscalation: {
    label: 'Human escalation',
    description: 'Pause AI replies and alert a teammate when the customer needs a human or the AI cannot answer with confidence.',
  },
  bookAppointment: {
    label: 'Book appointment',
    description: 'Guide the customer through booking: choose the right service, collect required details, check availability, book only after explicit slot confirmation, then send the confirmation exactly as generated.',
  },
  subagent: {
    label: 'Subagent',
    description: 'Add a prompt for this workflow step.',
  },
  say: {
    label: 'Say',
    description: 'Send a message in the conversation.',
  },
  updateState: {
    label: 'Update state',
    description: 'Prepare state changes for a future workflow action.',
  },
  agentTransfer: {
    label: 'Agent transfer',
    description: 'Hand the conversation to another agent.',
  },
  phoneTransfer: {
    label: 'Phone number transfer',
    description: 'Route the conversation to a phone number.',
  },
  tool: {
    label: 'Tool',
    description: 'Dispatch a tool from the workflow.',
  },
  end: {
    label: 'End',
  },
};

export const WORKFLOW_NODE_DEFAULT_CONDITIONS: Partial<
  Record<WorkflowNodeKind, { label: string; detail: string }>
> = {
  answerQuestions: {
    label: 'Customer question',
    detail: 'If the customer asks a question about the business, products, services, policies, pricing, or support details, answer using the knowledge base.',
  },
  sendText: {
    label: 'Send message',
    detail: 'If the customer reaches this step, send this configured message.',
  },
  bookAppointment: {
    label: 'Yes',
    detail: 'If the customer wants to book one of the selected services, proceed to appointment booking.',
  },
  humanEscalation: {
    label: 'Needs human',
    detail: 'If the customer asks for a human teammate, the AI is unsure, or the workflow cannot answer safely, pause AI replies and escalate to the team.',
  },
};

export function isWorkflowTerminalNodeKind(kind: WorkflowNodeKind) {
  return WORKFLOW_TERMINAL_NODE_KINDS.includes(
    kind as (typeof WORKFLOW_TERMINAL_NODE_KINDS)[number],
  );
}

export function isWorkflowActionNodeKind(kind: WorkflowNodeKind) {
  return WORKFLOW_ACTION_NODE_KINDS.includes(
    kind as (typeof WORKFLOW_ACTION_NODE_KINDS)[number],
  );
}

export function isWorkflowInitiallyReadyNodeKind(kind: WorkflowNodeKind) {
  return WORKFLOW_INITIALLY_READY_NODE_KINDS.includes(
    kind as (typeof WORKFLOW_INITIALLY_READY_NODE_KINDS)[number],
  );
}

export function workflowNodeTitle(kind: WorkflowNodeKind) {
  return WORKFLOW_NODE_META[kind].label;
}

export function workflowNodeDisplayTitle(
  kind: WorkflowNodeKind,
  title: string,
) {
  if (kind === 'start') {
    return workflowNodeTitle(kind);
  }
  return title;
}

export function workflowNodeDescription(kind: WorkflowNodeKind) {
  return WORKFLOW_NODE_META[kind].description;
}

export function workflowNodeDefaultCondition(kind: WorkflowNodeKind) {
  return WORKFLOW_NODE_DEFAULT_CONDITIONS[kind];
}

export function workflowConditionDisplayLabel(label?: string) {
  const trimmedLabel = label?.trim();
  if (!trimmedLabel || trimmedLabel === WORKFLOW_CONDITION_EDGE_LABEL) {
    return undefined;
  }
  return trimmedLabel;
}
