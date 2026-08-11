import type { Doc } from '../../../convex/_generated/dataModel';
import { getWhatsAppHistoryDisplayProgress, getWhatsAppSyncStatus } from '@/lib/whatsappSyncStatus';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ChannelReadyStatus } from './ChannelReadyStatus';

type WhatsAppSyncSummaryProps = {
  channel: Doc<'channels'>;
};

export function WhatsAppSyncSummary({ channel }: WhatsAppSyncSummaryProps) {
  const status = getWhatsAppSyncStatus(channel);
  if (!status) return null;

  const isSyncing =
    channel.historySyncStatus === 'requested' ||
    channel.historySyncStatus === 'syncing' ||
    channel.contactSyncStatus === 'requested' ||
    channel.contactSyncStatus === 'syncing';
  const showProgress = isSyncing && status.showCheck !== true;
  const pulseProgress =
    (channel.contactSyncStatus === 'requested' ||
      channel.contactSyncStatus === 'syncing') &&
    channel.historySyncStatus !== 'syncing';

  return (
    <div className="flex w-full flex-col gap-1.5 text-[11px] leading-snug">
      {status.showCheck ? (
        <ChannelReadyStatus label={status.label} />
      ) : (
        <p className="truncate font-medium text-foreground">{status.label}</p>
      )}
      {showProgress ? (
        <Progress
          value={getWhatsAppHistoryDisplayProgress(channel)}
          className={cn('h-1.5 w-full', pulseProgress && 'animate-pulse bg-primary/10')}
        />
      ) : status.detail ? (
        <p className="line-clamp-2 text-muted-foreground">{status.detail}</p>
      ) : null}
    </div>
  );
}
