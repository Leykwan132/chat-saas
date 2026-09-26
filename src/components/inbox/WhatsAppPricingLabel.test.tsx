import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import {
  WhatsAppPricingLabel,
  WHATSAPP_SERVICE_PRICING_TOOLTIP,
} from './WhatsAppPricingLabel';
import { TooltipProvider } from '@/components/ui/tooltip';

function renderLabel(
  props: Parameters<typeof WhatsAppPricingLabel>[0],
) {
  return renderToStaticMarkup(
    <TooltipProvider>
      <WhatsAppPricingLabel {...props} />
    </TooltipProvider>,
  );
}

test('shows Free for legacy outgoing WhatsApp messages', () => {
  const markup = renderLabel({ service: 'whatsapp' });

  expect(markup).toContain('Free');
  expect(markup).toContain('aria-label="About WhatsApp service pricing"');
  expect(WHATSAPP_SERVICE_PRICING_TOOLTIP).toBe(
    'Starting 1 October, Meta includes 1,000 free WhatsApp service messages each month. After that, service messages are charged. Add a payment method in Meta Business Manager to keep sending WhatsApp messages with Kilobot.',
  );
});

test('shows the stored MYR rate for billed WhatsApp service messages', () => {
  const markup = renderLabel({
    service: 'whatsapp',
    pricing: {
      billable: true,
      pricingModel: 'PMP',
      type: 'regular',
      category: 'service',
      servicePriceMyr: '0.00321',
      recordedAt: 1_790_438_560_000,
    },
  });

  expect(markup).toContain('Service (RM0.00321)');
});

test('does not show a WhatsApp pricing label for Instagram messages', () => {
  expect(renderLabel({ service: 'instagram' })).toBe('');
});

test('maps persisted service pricing into the outgoing Inbox timestamp row', () => {
  const mappingSource = readFileSync(
    new URL('../../../convex/chat/inboxMessageMapping.ts', import.meta.url),
    'utf8',
  );
  const threadSource = readFileSync(
    new URL('./InboxThreadMessages.tsx', import.meta.url),
    'utf8',
  );

  expect(mappingSource).toContain('service: ledger.service');
  expect(mappingSource).toContain('receiptPricing: ledger.receiptMetadata?.pricing');
  expect(threadSource).toContain('<WhatsAppPricingLabel');
});
