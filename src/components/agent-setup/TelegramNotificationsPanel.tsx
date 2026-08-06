import { useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ChevronDown, Mail, Plus, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from '@/components/ui/input-group';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  TELEGRAM_NOTIFICATION_KINDS,
  type TelegramNotificationKind,
} from '../../../shared/telegramNotificationKinds';
import { recipientAddErrorMessage } from './telegramRecipientError';
import { TelegramRecipientRow } from './TelegramRecipientRow';
import { telegramNotificationOptions } from './telegramNotificationOptions';
import { useTelegramVerificationUrls } from './useTelegramVerificationUrls';

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
  const sendEventPreview = useAction(api.telegramNotifications.testMessage.sendEventPreview);
  const [phone, setPhone] = useState<string>();
  const [recipientError, setRecipientError] = useState<string>();
  const [isAdding, setIsAdding] = useState(false);
  const [testingKind, setTestingKind] = useState<TelegramNotificationKind>();
  const [openNotificationKinds, setOpenNotificationKinds] = useState<TelegramNotificationKind[]>([]);
  const { verificationUrls, rememberVerificationUrl, ensureVerificationUrl } = useTelegramVerificationUrls(
    subscriptions,
    regenerate,
  );
  const selectedKinds = preferences?.kinds ?? TELEGRAM_NOTIFICATION_KINDS;
  const sendableSubscriptions = subscriptions?.filter((subscription) => subscription.canSendTest) ?? [];

  async function copyVerificationUrl(
    subscriptionId: Id<'agentTelegramNotificationSubscriptions'>,
    url: string,
  ) {
    rememberVerificationUrl(subscriptionId, url);
    await navigator.clipboard.writeText(url);
    toast.success('Verification link copied');
  }

  async function addRecipient() {
    if (!phone) return;
    setRecipientError(undefined);
    setIsAdding(true);
    try {
      const result = await add({ agentId, phone });
      if (result.state === 'pending') {
        await copyVerificationUrl(result.subscriptionId, result.verificationUrl);
      } else {
        toast.success('Telegram recipient connected');
      }
      setPhone(undefined);
    } catch (error) {
      setRecipientError(recipientAddErrorMessage(error));
    } finally {
      setIsAdding(false);
    }
  }

  async function copyVerificationLink(subscriptionId: Id<'agentTelegramNotificationSubscriptions'>) {
    try {
      const url = verificationUrls[subscriptionId] ?? await ensureVerificationUrl(subscriptionId);
      if (!url) throw new Error('Missing verification URL');
      await copyVerificationUrl(subscriptionId, url);
    } catch {
      toast.error('Could not create a verification link');
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

  async function sendNotificationTest(
    kind: TelegramNotificationKind,
    subscriptionId: Id<'agentTelegramNotificationSubscriptions'>,
  ) {
    setTestingKind(kind);
    const toastId = toast.loading('Sending test message…');
    try {
      await sendEventPreview({ subscriptionId, kind });
      toast.success('Test message sent', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send a test message', { id: toastId });
    } finally {
      setTestingKind(undefined);
    }
  }

  function toggleNotificationDetails(kind: TelegramNotificationKind) {
    setOpenNotificationKinds((current) => (
      current.includes(kind)
        ? current.filter((openKind) => openKind !== kind)
        : [...current, kind]
    ));
  }

  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight">Recipients List</h3>
          <p className="text-xs text-muted-foreground">Add up to five numbers. Each person verifies their own Telegram account before receiving updates.</p>
        </div>
        <div className="w-full max-w-xs">
          <InputGroup className="h-10 rounded-md border-border bg-background">
            <PhoneInput
              defaultCountry="MY"
              international
              countryCallingCodeEditable={false}
              value={phone}
              onChange={(value) => {
                setPhone(value);
                setRecipientError(undefined);
              }}
              disabled={isAdding || subscriptions?.length === 5}
              className="min-w-0 flex-1 px-3 text-sm"
              numberInputProps={{ className: 'min-w-0 bg-transparent outline-none' }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                variant="secondary"
                size="icon-xs"
                aria-label="Add Telegram recipient"
                onClick={addRecipient}
                disabled={!phone || isAdding || subscriptions?.length === 5}
              >
                <Plus />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {recipientError ? <p role="alert" className="mt-2 text-xs text-destructive">{recipientError}</p> : null}
        </div>
        <div className="flex flex-col gap-3">
          {subscriptions?.map((subscription) => (
            <TelegramRecipientRow
              key={subscription.subscriptionId}
              phoneNumber={subscription.phoneNumber}
              state={subscription.state}
              enabled={subscription.enabled}
              verificationUrl={verificationUrls[subscription.subscriptionId]}
              onToggleEnabled={(enabled) => void setEnabled({ subscriptionId: subscription.subscriptionId, enabled })}
              onRemove={() => void remove({ subscriptionId: subscription.subscriptionId }).catch(() => toast.error('Could not remove Telegram recipient'))}
              onCopyVerificationLink={() => void copyVerificationLink(subscription.subscriptionId)}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-8 lg:border-t-0 lg:border-l lg:border-border lg:pl-8 lg:pt-0">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight">Notification Types</h3>
          <p className="text-xs text-muted-foreground">Choose the fixed updates sent to every connected phone number.</p>
        </div>
        <Accordion
          type="multiple"
          value={openNotificationKinds}
          onValueChange={(value) => setOpenNotificationKinds(value as TelegramNotificationKind[])}
          className="rounded-none border-0"
        >
          {telegramNotificationOptions.map((option) => {
            const isEnabled = selectedKinds.includes(option.kind);
            return (
              <AccordionItem key={option.kind} value={option.kind}>
                <div
                  className="flex w-full cursor-pointer items-start rounded-md px-3 transition-colors hover:bg-muted/60"
                  onClick={(event) => {
                    const target = event.target;
                    if (target instanceof Element && target.closest('[data-slot="accordion-trigger"], [data-slot="switch"]')) return;
                    toggleNotificationDetails(option.kind);
                  }}
                >
                  <AccordionTrigger showIndicator={false} className="min-w-0 flex-1 px-0 py-4 hover:no-underline">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        {option.kind === 'humanEscalation' ? (
                          <TriangleAlert className="size-4 shrink-0 text-amber-600" />
                        ) : (
                          <Mail className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{option.label}</span>
                      </span>
                      <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">{option.description}</span>
                    </span>
                  </AccordionTrigger>
                  <div className="ml-auto flex shrink-0 items-center gap-2 py-4">
                    <span className="text-xs text-muted-foreground">{isEnabled ? 'Sending' : 'Not Sending'}</span>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(enabled) => void setNotificationKind(option.kind, enabled)}
                      aria-label={`Send ${option.label.toLowerCase()} notifications`}
                    />
                  </div>
                </div>
                <AccordionContent className="-mx-4 px-3">
                  <div className="flex flex-col gap-3 pt-1">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Sample message</p>
                      <pre className="whitespace-pre-wrap rounded-md bg-muted px-3 py-3 font-sans text-sm leading-relaxed text-muted-foreground">{option.preview}</pre>
                    </div>
                    <div className="flex justify-start pt-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={testingKind === option.kind || sendableSubscriptions.length === 0}
                          >
                            Send a test message
                            <ChevronDown className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuLabel>Send to</DropdownMenuLabel>
                          <DropdownMenuGroup>
                            {sendableSubscriptions.map((subscription) => (
                              <DropdownMenuItem
                                key={subscription.subscriptionId}
                                onSelect={() => void sendNotificationTest(option.kind, subscription.subscriptionId)}
                              >
                                {subscription.phoneNumber}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </section>
  );
}
