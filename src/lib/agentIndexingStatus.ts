export type AgentIndexingStatus = {
  isIndexing: boolean;
  queued: number;
  running: number;
};

export type AgentTrainingStatus = 'loading' | 'ready' | 'indexing';

export function getAgentTrainingStatus(
  isCheckingStatus: boolean,
  indexingStatus: AgentIndexingStatus | null | undefined,
): AgentTrainingStatus {
  if (isCheckingStatus || indexingStatus === null || indexingStatus === undefined) {
    return 'loading';
  }
  return indexingStatus.isIndexing ? 'indexing' : 'ready';
}

export function getAgentTrainingLabel(indexingStatus: AgentIndexingStatus) {
  if (indexingStatus.running > 0) {
    return indexingStatus.running === 1
      ? 'Training 1 item…'
      : `Training ${indexingStatus.running} items…`;
  }
  return indexingStatus.queued === 1
    ? '1 item in queue…'
    : `${indexingStatus.queued} items in queue…`;
}

export function getAgentTrainingDescription(status: AgentTrainingStatus) {
  if (status === 'loading') {
    return 'Checking whether your latest knowledge changes are ready.';
  }
  if (status === 'indexing') {
    return 'Your latest knowledge changes are being trained and will be used once indexing finishes.';
  }
  return 'All knowledge changes are indexed and ready for your agent to use.';
}
