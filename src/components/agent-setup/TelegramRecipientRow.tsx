import { Check, Clock3, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

type TelegramRecipientRowProps = {
  phoneNumber: string;
  state: 'pending' | 'connected' | 'disabled' | 'blocked';
  enabled: boolean;
  verificationUrl?: string;
  onToggleEnabled: (enabled: boolean) => void;
  onRemove: () => void;
  onCopyVerificationLink: () => void;
};

export function TelegramRecipientRow({
  phoneNumber,
  state,
  enabled,
  verificationUrl,
  onToggleEnabled,
  onRemove,
  onCopyVerificationLink,
}: TelegramRecipientRowProps) {
  const showVerificationLink = state === 'pending' || state === 'blocked';
  const stateLabel = state === 'pending'
    ? 'Pending verification'
    : state === 'connected'
      ? 'Ready to Accept Notification'
      : state === 'blocked'
        ? 'Blocked'
        : 'Disabled';

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-medium">{phoneNumber}</p>
            {state === 'connected' ? (
              <span
                role="img"
                aria-label={`Telegram recipient ${phoneNumber} connected`}
                className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-800"
              >
                <Check className="size-2.5 text-white" strokeWidth={2.5} />
              </span>
            ) : null}
            {state === 'pending' ? (
              <span
                role="img"
                aria-label={`Telegram recipient ${phoneNumber} pending verification`}
                className="flex size-4 shrink-0 items-center justify-center rounded-full bg-yellow-500"
              >
                <Clock3 className="size-2.5 text-white" strokeWidth={2.5} />
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{stateLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">{enabled ? 'Active' : 'Inactive'}</span>
          <Switch
            checked={enabled}
            onCheckedChange={onToggleEnabled}
            aria-label={`Enable ${phoneNumber}`}
          />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${phoneNumber}`}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {showVerificationLink && verificationUrl ? (
        <div className="flex flex-col gap-2 pt-0.5">
          <p className="text-xs font-medium text-muted-foreground">Activation link</p>
          <div className="flex items-start gap-3 rounded-md bg-muted px-3 py-3">
            <span className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-muted-foreground">
              {verificationUrl}
            </span>
            <Button
              variant="secondary"
              size="xs"
              className="shrink-0"
              onClick={onCopyVerificationLink}
            >
              <Copy className="size-3" />
              Copy
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
