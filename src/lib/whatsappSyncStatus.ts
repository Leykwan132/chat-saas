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

export function getWhatsAppSyncStatus(channel: Doc<'channels'> | undefined):
  | { label: string; detail?: string }
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
    return { label: 'Chat history sync complete' };
  }
  if (
    channel.historySyncStatus === 'requested' ||
    channel.historySyncStatus === 'syncing'
  ) {
    const progress = Math.max(0, Math.min(100, channel.historySyncProgress ?? 0));
    return {
      label: `${historyPhaseLabel(channel.historySyncPhase)} (${progress}%)`,
      detail:
        channel.contactSyncStatus === 'completed'
          ? 'Contacts synced. Keep WhatsApp Business open while chats finish.'
          : 'Syncing contacts and messages from WhatsApp Business.',
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
