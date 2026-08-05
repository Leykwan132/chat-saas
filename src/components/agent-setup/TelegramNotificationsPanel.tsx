import { useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Copy, Link2, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

type TelegramNotificationsPanelProps = {
  agentId: Id<'agents'>;
};

export function TelegramNotificationsPanel({ agentId }: TelegramNotificationsPanelProps) {
  const subscriptions = useQuery(api.telegramNotifications.subscriptions.listForAgent, { agentId });
  const add = useMutation(api.telegramNotifications.subscriptions.add);
  const remove = useMutation(api.telegramNotifications.subscriptions.remove);
  const setEnabled = useMutation(api.telegramNotifications.subscriptions.setEnabled);
  const regenerate = useMutation(api.telegramNotifications.subscriptions.regenerateVerificationLink);
  const sendTest = useAction(api.telegramNotifications.testMessage.send);
  const [phone, setPhone] = useState<string>();
  const [verificationUrl, setVerificationUrl] = useState<string>();
  const [isAdding, setIsAdding] = useState(false);

  async function copyVerificationUrl(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success('Verification link copied');
  }

  async function addRecipient() {
    if (!phone) return;
    setIsAdding(true);
    try {
      const result = await add({ agentId, phone });
      if (result.state === 'pending') {
        setVerificationUrl(result.verificationUrl);
        await copyVerificationUrl(result.verificationUrl);
      } else {
        toast.success('Telegram recipient connected');
      }
      setPhone(undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add Telegram recipient');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Telegram notifications</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Add up to five phone numbers. Each person verifies their own Telegram account before receiving updates.
        </p>
      </div>
      <div className="flex gap-2">
        <PhoneInput
          defaultCountry="MY"
          international
          countryCallingCodeEditable={false}
          value={phone}
          onChange={setPhone}
          disabled={isAdding || subscriptions?.length === 5}
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          numberInputProps={{ className: 'min-w-0 bg-transparent outline-none' }}
        />
        <Button size="sm" onClick={addRecipient} disabled={!phone || isAdding || subscriptions?.length === 5}>
          Add
        </Button>
      </div>
      {verificationUrl ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted p-2 text-xs">
          <span className="truncate">Share the copied verification link with the recipient.</span>
          <Button variant="ghost" size="icon-sm" onClick={() => copyVerificationUrl(verificationUrl)} aria-label="Copy verification link">
            <Copy className="size-4" />
          </Button>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        {subscriptions?.map((subscription) => (
          <div key={subscription.subscriptionId} className="flex items-center gap-2 rounded-md border border-border p-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{subscription.phoneNumber}</p>
              <p className="text-xs capitalize text-muted-foreground">{subscription.state}</p>
            </div>
            <Switch
              checked={subscription.enabled}
              onCheckedChange={(enabled) => void setEnabled({ subscriptionId: subscription.subscriptionId, enabled })}
              aria-label={`Enable ${subscription.phoneNumber}`}
            />
            {subscription.state === 'pending' || subscription.state === 'blocked' ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Copy verification link for ${subscription.phoneNumber}`}
                onClick={() => void regenerate({ subscriptionId: subscription.subscriptionId }).then((result) => {
                  setVerificationUrl(result.verificationUrl);
                  return copyVerificationUrl(result.verificationUrl);
                }).catch(() => toast.error('Could not create a verification link'))}
              >
                <Link2 className="size-4" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!subscription.canSendTest}
              aria-label={`Send test to ${subscription.phoneNumber}`}
              onClick={() => void sendTest({ subscriptionId: subscription.subscriptionId }).then(() => toast.success('Test notification sent')).catch((error) => toast.error(error instanceof Error ? error.message : 'Could not send test'))}
            >
              <Send className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${subscription.phoneNumber}`}
              onClick={() => void remove({ subscriptionId: subscription.subscriptionId }).catch(() => toast.error('Could not remove Telegram recipient'))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
