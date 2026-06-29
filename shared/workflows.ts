export const WORKFLOW_NODE_KINDS = [
  'start',
  'answerQuestions',
  'aiResponds',
  'sendImage',
  'sendText',
  'closeConversation',
  'updateLeadsStatus',
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
  'answerQuestions',
  'updateLeadsStatus',
  'bookAppointment',
  'aiResponds',
  'closeConversation',
] as const;

export type AddableWorkflowNodeKind =
  (typeof ADDABLE_WORKFLOW_NODE_KINDS)[number];

export const WORKFLOW_CONDITION_EDGE_LABEL = 'Condition';

export const WORKFLOW_TERMINAL_NODE_KINDS = [
  'closeConversation',
  'end',
] as const satisfies readonly WorkflowNodeKind[];

export const WORKFLOW_ACTION_NODE_KINDS = [
  'answerQuestions',
  'aiResponds',
  'updateLeadsStatus',
  'bookAppointment',
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
    label: 'Send image',
    description: 'Send an image in the conversation.',
  },
  sendText: {
    label: 'Send text',
    description: 'Send a text message in the conversation.',
  },
  closeConversation: {
    label: 'Close conversation',
  },
  updateLeadsStatus: {
    label: 'Qualify leads',
    description: 'Qualify the customer as hot, warm, or cold. Hot leads show strong buying intent such as pricing, demos, availability, comparisons, or readiness to purchase. Warm leads are interested but still exploring. Cold leads are disengaged, only browsing, or are support conversations without purchase intent.',
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
  bookAppointment: {
    label: 'Ready to book',
    detail: 'If the user is very sure about their interest in the services, proceed to book an appointment.',
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
