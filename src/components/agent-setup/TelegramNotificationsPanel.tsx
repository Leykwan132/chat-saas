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
import {
  TELEGRAM_NOTIFICATION_KINDS,
  type TelegramNotificationKind,
} from '../../../shared/telegramNotificationKinds';
import { telegramNotificationOptions } from './telegramNotificationOptions';

type TelegramNotificationsPanelProps = {
  agentId: Id<'agents'>;
};

export function TelegramNotificationsPanel({ agentId }: TelegramNotificationsPanelProps) {
  const subscriptions = useQuery(api.telegramNotifications.subscriptions.listForAgent, { agentId });
  const preferences = useQuery(api.telegramNotifications.preferences.getForAgent, { agentId });
  const add = useMutation(api.telegramNotifications.subscriptions.add);
  const remove = useMutation(api.telegramNotifications.subscriptions.remove);
  const setEnabled = useMutation(api.telegramNotifications.subscriptions.setEnabled);
  const setPreferences = useMutation(api.telegramNotifications.preferences.setForAgent);
  const regenerate = useMutation(api.telegramNotifications.subscriptions.regenerateVerificationLink);
  const sendTest = useAction(api.telegramNotifications.testMessage.send);
  const sendEventPreview = useAction(api.telegramNotifications.testMessage.sendEventPreview);
  const [phone, setPhone] = useState<string>();
  const [verificationUrl, setVerificationUrl] = useState<string>();
  const [isAdding, setIsAdding] = useState(false);
  const [testingKind, setTestingKind] = useState<TelegramNotificationKind>();
  const selectedKinds = preferences?.kinds ?? TELEGRAM_NOTIFICATION_KINDS;

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

  async function setNotificationKind(kind: TelegramNotificationKind, enabled: boolean) {
    const kinds = enabled
      ? [...selectedKinds, kind]
      : selectedKinds.filter((selectedKind) => selectedKind !== kind);
    const toastId = toast.loading('Saving notification preferences…');
    try {
      await setPreferences({ agentId, kinds });
      toast.success('Notification preferences saved', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save notification preferences', {
        id: toastId,
      });
    }
  }

  async function sendNotificationTest(kind: TelegramNotificationKind) {
    setTestingKind(kind);
    const toastId = toast.loading('Sending test message…');
    try {
      const result = await sendEventPreview({ agentId, kind });
      toast.success(`Test message sent to ${result.sent} recipient${result.sent === 1 ? '' : 's'}`, { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send a test message', { id: toastId });
    } finally {
      setTestingKind(undefined);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Recipients List</h3>
            <p className="text-xs text-muted-foreground">Add up to five numbers. Each person verifies their own Telegram account before receiving updates.</p>
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
        </div>
        <div className="flex flex-col gap-3 lg:border-l lg:border-border lg:pl-6">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Notification Updates</h3>
            <p className="text-xs text-muted-foreground">Choose the fixed updates sent to every connected phone number.</p>
          </div>
          <div className="divide-y divide-border">
            {telegramNotificationOptions.map((option) => {
              const isEnabled = selectedKinds.includes(option.kind);
              return (
                <div key={option.kind} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-auto px-0 text-xs text-primary hover:bg-transparent hover:text-primary/80"
                      disabled={testingKind === option.kind}
                      onClick={() => void sendNotificationTest(option.kind)}
                    >
                      Send a test message
                    </Button>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-center">
                    <span className="text-xs text-muted-foreground">{isEnabled ? 'Sending' : 'Not Sending'}</span>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(enabled) => void setNotificationKind(option.kind, enabled)}
                      aria-label={`Send ${option.label.toLowerCase()} notifications`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
