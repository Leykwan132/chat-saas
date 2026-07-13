type WorkflowOutboundSource =
  | 'ai'
  | 'human'
  | 'workflowReminder'
  | 'workflowFollowUp'
  | 'broadcast';

export function isEligibleWorkflowFollowUpOutbound({
  service,
  direction,
  status,
  source,
  broadcast,
}: {
  service: string;
  direction: string;
  status?: string;
  source: WorkflowOutboundSource;
  broadcast: boolean;
}) {
  return service === 'whatsapp' &&
    direction === 'outgoing' &&
    (status === 'sent' || status === 'delivered' || status === 'read') &&
    !broadcast &&
    (source === 'ai' || source === 'human');
}

export function matchesWorkflowFollowUpAudience({
  filters,
  leadTemperature,
  tags,
}: {
  filters: string[];
  leadTemperature?: string;
  tags: string[];
}) {
  return filters.some((filter) => {
    if (filter.startsWith('lead:')) return filter.slice(5) === leadTemperature;
    if (filter.startsWith('tag:')) return tags.includes(filter.slice(4));
    throw new Error(`Unknown follow-up audience filter: ${filter}`);
  });
}

export function planWorkflowFollowUpOutbound({
  existingWorkId,
  latestOutboundAt,
  startAfterMs,
}: {
  existingWorkId?: string;
  latestOutboundAt: number;
  startAfterMs: number;
}) {
  return {
    dueAt: latestOutboundAt + startAfterMs,
    enqueue: existingWorkId === undefined,
    workId: existingWorkId,
  };
}
