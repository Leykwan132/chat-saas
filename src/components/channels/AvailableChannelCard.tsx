import { BookOpen } from 'lucide-react';
import { ConnectWhatsAppButton } from '@/components/ConnectWhatsAppButton';
import { ConnectInstagramButton } from '@/components/ConnectInstagramButton';
import { ConnectMessengerButton } from '@/components/ConnectMessengerButton';
import { Button } from '@/components/ui/button';
import {
  CHANNEL_SERVICE_META,
  type SupportedChannelService,
} from '@/lib/channelServiceMeta';
import { cn } from '@/lib/utils';

type AvailableChannelCardProps = {
  service: SupportedChannelService;
  disabled?: boolean;
  onLimitReached?: () => void;
};

const connectTriggerClass =
  'h-6 rounded-md px-2.5 text-[11px] font-medium shadow-none';

export function AvailableChannelCard({
  service,
  disabled,
  onLimitReached,
}: AvailableChannelCardProps) {
  const meta = CHANNEL_SERVICE_META[service];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        'group relative flex size-56 flex-col rounded-lg border border-border bg-card p-3.5 transition-colors',
        'hover:border-foreground/20 hover:bg-muted/30',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Icon className={cn('size-4 shrink-0', meta.iconColor)} />
            <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {meta.label}
            </h3>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {meta.description}
          </p>
        </div>

        <div
          className={cn(
            'mt-auto flex justify-end gap-2',
            '[&_button]:h-6 [&_button]:rounded-md [&_button]:px-2.5 [&_button]:text-[11px] [&_button]:font-medium [&_button]:shadow-none',
            '[&>div]:contents',
          )}
        >
          {service === 'whatsapp' ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={connectTriggerClass}
            >
              <a
                href="https://docs.kilobot.app/channels/whatsapp#connect-with-coexistence"
                target="_blank"
                rel="noreferrer"
              >
                <BookOpen data-icon="inline-start" />
                Guide
              </a>
            </Button>
          ) : null}
          {disabled ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={connectTriggerClass}
              onClick={() => onLimitReached?.()}
            >
              Connect
            </Button>
          ) : service === 'whatsapp' ? (
            <ConnectWhatsAppButton forceAllowConnect />
          ) : service === 'instagram' ? (
            <ConnectInstagramButton forceAllowConnect />
          ) : (
            <ConnectMessengerButton forceAllowConnect />
          )}
        </div>
      </div>
    </div>
  );
}
