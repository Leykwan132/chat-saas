import type { Doc } from '../../convex/_generated/dataModel';
import { getWhatsAppSyncStatus } from '@/lib/whatsappSyncStatus';

export function isOpenWhatsAppConnectionAttempt(
  attempt: Doc<'whatsappConnectionAttempts'> | null | undefined,
): boolean {
  if (!attempt) return false;
  return (
    attempt.status === 'started' ||
    attempt.status === 'signup_finished' ||
    attempt.status === 'token_ready' ||
    attempt.status === 'connected' ||
    attempt.status === 'syncing'
  );
}

export function getWhatsAppConnectionAttemptStatus(
  attempt: Doc<'whatsappConnectionAttempts'>,
  channel: Doc<'channels'> | undefined,
): { label: string; detail?: string; spinning: boolean } {
  switch (attempt.status) {
    case 'started':
      return {
        label: 'Waiting for WhatsApp setup',
        detail: 'Complete the Meta signup window to continue.',
        spinning: true,
      };
    case 'signup_finished':
    case 'token_ready':
      return {
        label: 'Finishing connection',
        detail: channel?.progressStep
          ? 'Setting up your WhatsApp Business account…'
          : 'Exchanging credentials with Meta…',
        spinning: true,
      };
    case 'connected':
      return {
        label: 'WhatsApp connected',
        detail: 'Meta confirmed the link. Starting contact and history sync…',
        spinning: true,
      };
    case 'syncing': {
      const sync = getWhatsAppSyncStatus(channel);
      return {
        label: sync?.label ?? 'Syncing contacts and chat history',
        detail:
          sync?.detail ??
          'Keep WhatsApp Business open on your phone while we import contacts and messages.',
        spinning: true,
      };
    }
    case 'error':
      return {
        label: 'Connection failed',
        detail: attempt.lastError,
        spinning: false,
      };
    default:
      return { label: 'Connecting WhatsApp', spinning: true };
  }
}
