import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { TelegramNotificationsPanel } from './TelegramNotificationsPanel';

let queryCount = 0;
let recipientState: 'connected' | 'pending' = 'connected';

vi.mock('convex/react', () => ({
  useAction: () => vi.fn(),
  useMutation: () => vi.fn(),
  useQuery: () => {
    queryCount += 1;
    return queryCount === 1
      ? [{
        subscriptionId: 'telegram-subscription-id',
        phoneNumber: '+60 12-949 9394',
        state: recipientState,
        enabled: true,
        canSendTest: true,
      }]
      : { kinds: ['humanEscalation', 'bookingCreated', 'bookingUpdated', 'bookingCancelled'] };
  },
}));

test('shows all four notification choices below the phone-number controls', () => {
  queryCount = 0;
  recipientState = 'connected';

  const markup = renderToStaticMarkup(
    <TelegramNotificationsPanel agentId={'agent-id' as never} />,
  );

  expect(markup).toContain('Recipients List');
  expect(markup).toContain('Notification Types');
  expect(markup).toContain('Human escalation');
  expect(markup).toContain('New booking');
  expect(markup).toContain('Booking updated');
  expect(markup).toContain('Booking cancelled');
  expect(markup).toContain('When the agent asks for human help.');
  expect(markup).toContain('When a customer books an appointment.');
  expect(markup).toContain('When an appointment is changed.');
  expect(markup).toContain('When an appointment is cancelled.');
  expect(markup).toContain('Sending');
  expect(markup).toContain('aria-label="Telegram recipient +60 12-949 9394 connected"');
  expect(markup).toContain('Ready to Accept Notification');
  expect(markup).toContain('lucide-check');
  expect(markup).toContain('size-4 shrink-0 items-center justify-center rounded-full bg-emerald-800');
  expect(markup).toContain('size-2.5 text-white');
  expect(markup).toContain('>Active</span>');
  expect(markup).not.toContain('aria-label="Send test to +60 12-949 9394"');
  expect(markup).toContain('lucide-triangle-alert');
  expect(markup.match(/lucide-mail/g)).toHaveLength(3);
  expect(markup).not.toContain('lucide-chevron-down');
  expect(markup).not.toContain('lucide-chevron-up');
  expect(markup.indexOf('Notification Types')).toBeGreaterThan(markup.indexOf('Recipients List'));

  const source = readFileSync(new URL('./TelegramNotificationsPanel.tsx', import.meta.url), 'utf8');
  const rowSource = readFileSync(new URL('./TelegramRecipientRow.tsx', import.meta.url), 'utf8');
  expect(source).toContain('grid gap-8 lg:grid-cols-2');
  expect(source).toContain('lg:border-l lg:border-border lg:pl-8');
  expect(source).not.toContain('rounded-md border border-border p-3');
  expect(source).not.toContain('whitespace-pre-wrap rounded-md bg-muted p-2');
  expect(source).toContain('DropdownMenu');
  expect(source).toContain('DropdownMenuItem');
  expect(source).toContain('subscription.phoneNumber');
  expect(rowSource).toContain("enabled ? 'Active' : 'Inactive'");
  expect(source).not.toContain('rounded-lg border border-border bg-card p-4');
  expect(source).toContain('text-base font-semibold tracking-tight');
  expect(source).toContain('max-w-xs');
  expect(source).toContain('InputGroup');
  expect(source).toContain('InputGroupAddon');
  expect(source).toContain('InputGroupButton');
  expect(source).toContain('Plus');
  expect(source).toContain('Add Telegram recipient');
  expect(source).toContain('recipientAddErrorMessage');
  expect(source).toContain('role="alert"');
  expect(source).toContain('text-destructive');
  expect(source).toContain('Mail');
  expect(source).toContain('flex items-center gap-2');
  expect(source).toContain('mt-1 block text-xs');
  expect(source).not.toContain('pl-6 text-xs');
  expect(source).toContain('px-0 py-4');
  expect(source).toContain('option.description');
  expect(source).toContain('ml-auto');
  expect(source).toContain('rounded-md px-3 transition-colors hover:bg-muted/60');
  expect(source).toContain('<AccordionContent className="-mx-4 px-3">');
  expect(source).toContain('showIndicator={false}');
  expect(source).toContain('toggleNotificationDetails');
  expect(source).toContain('option.preview');
  expect(source).toContain('Sample message');
  expect(source).toContain('px-3 py-3 font-sans text-sm');
  expect(source).toContain('justify-start');
  expect(source).toContain('ChevronDown');
  expect(source).toContain('Accordion');
  expect(source).toContain('AccordionItem');
  expect(source).toContain('AccordionContent');
  expect(source).toContain('type="multiple"');
  expect(source).toContain('variant="secondary"');
  expect(source).toContain('Send a test message');
});

test('keeps pending-recipient verification controls in the recipient row', () => {
  queryCount = 0;
  recipientState = 'pending';

  const markup = renderToStaticMarkup(
    <TelegramNotificationsPanel agentId={'agent-id' as never} />,
  );

  expect(markup).toContain('lucide-clock-3');
  expect(markup).toContain('bg-yellow-500');
  expect(markup).toContain('Pending verification');
  expect(markup).toContain('>Active</span>');

  const panelSource = readFileSync(new URL('./TelegramNotificationsPanel.tsx', import.meta.url), 'utf8');
  const rowSource = readFileSync(new URL('./TelegramRecipientRow.tsx', import.meta.url), 'utf8');
  const hookSource = readFileSync(new URL('./useTelegramVerificationUrls.ts', import.meta.url), 'utf8');
  expect(panelSource).not.toContain('Share the copied verification link with the recipient.');
  expect(rowSource).not.toContain('variant="link"');
  expect(rowSource).not.toContain('https://t.me/…?start=…');
  expect(rowSource).not.toContain('Use this activation link to get started in Telegram.');
  expect(rowSource).toContain('Activation link');
  expect(rowSource).toContain('break-all');
  expect(rowSource).toContain('bg-yellow-500');
  expect(rowSource).toContain('Ready to Accept Notification');
  expect(rowSource).toContain('text-xs text-muted-foreground');
  expect(rowSource).toContain('<Copy className="size-3" />');
  expect(hookSource).toContain('ensureVerificationUrl');
});
