import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import {
  WhatsAppPricingLabel,
  WHATSAPP_SERVICE_PRICING_RATE_CARD_URL,
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
    'WhatsApp charges service messages based on your customer\'s market.',
  );
  expect(WHATSAPP_SERVICE_PRICING_RATE_CARD_URL).toBe(
    'https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing#rate-cards-effective-october-1-2026',
  );
});

test('uses a tiny filled circle to separate the time from the pricing label', () => {
  const markup = renderLabel({ service: 'whatsapp' });

  expect(markup).toContain('lucide-circle');
  expect(markup).toContain('size-1 fill-current');
  expect(markup).toContain('items-center gap-1');
});

test('shows Service without a rate for billed WhatsApp service messages', () => {
  const markup = renderLabel({
    service: 'whatsapp',
    pricing: {
      billable: true,
      pricingModel: 'PMP',
      type: 'regular',
      category: 'service',
      recordedAt: 1_790_438_560_000,
    },
  });

  expect(markup).toContain('Service');
  expect(markup).not.toContain('RM');
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
