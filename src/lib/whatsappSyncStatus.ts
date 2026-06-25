import type { Doc } from '../../convex/_generated/dataModel';

function historyPhaseLabel(phase: number | undefined): string {
  switch (phase) {
    case 0:
      return 'Syncing recent chats';
    case 1:
      return 'Syncing older chats';
    case 2:
      return 'Finalizing older history';
    default:
      return 'Syncing chat history';
  }
}

export function getWhatsAppHistoryDisplayProgress(
  channel: Doc<'channels'>,
): number {
  if (channel.historySyncStatus === 'completed') {
    return 100;
  }

  const raw = channel.historySyncProgress ?? 0;
  const totalBatches = channel.historySyncTotalBatchCount;
  const completedBatches = channel.historySyncCompletedBatchCount ?? 0;

  if (
    channel.historySyncStatus === 'syncing' &&
    totalBatches !== undefined &&
    totalBatches > 0
  ) {
    return Math.min(
      99,
      90 + Math.floor((completedBatches / totalBatches) * 9),
    );
  }

  return Math.max(0, Math.min(90, raw));
}

export function getWhatsAppSyncStatus(channel: Doc<'channels'> | undefined):
  | { label: string; detail?: string; showCheck?: boolean }
  | null {
  if (!channel || channel.service !== 'whatsapp') return null;
  if (channel.historySyncStatus === 'not_shared') {
    return {
      label: 'History sharing was turned off',
      detail: 'Contacts will still sync, but past chats were not shared.',
    };
  }
  if (channel.historySyncStatus === 'failed') {
    return {
      label: 'History sync needs attention',
      detail: channel.historySyncError,
    };
  }
  if (channel.historySyncStatus === 'completed') {
    return { label: 'Ready', showCheck: true };
  }
  if (
    channel.historySyncStatus === 'requested' ||
    channel.historySyncStatus === 'syncing'
  ) {
    const progress = getWhatsAppHistoryDisplayProgress(channel);
    const importing =
      channel.historySyncTotalBatchCount !== undefined &&
      (channel.historySyncCompletedBatchCount ?? 0) <
        channel.historySyncTotalBatchCount;
    return {
      label: importing
        ? `Syncing chat history (${progress}%)`
        : `${historyPhaseLabel(channel.historySyncPhase)} (${progress}%)`,
    };
  }
  if (channel.contactSyncStatus === 'requested') {
    return { label: 'Syncing contacts' };
  }
  if (channel.contactSyncStatus === 'completed') {
    return { label: 'Contacts synced' };
  }
  return null;
}
