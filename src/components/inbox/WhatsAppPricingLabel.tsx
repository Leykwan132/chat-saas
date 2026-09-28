import { Circle, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type WhatsAppReceiptPricing = {
  billable: boolean;
  pricingModel: string;
  type: string;
  category: string;
  recordedAt: number;
};

export const WHATSAPP_SERVICE_PRICING_TOOLTIP =
  'WhatsApp charges service messages based on your customer\'s market.';

export const WHATSAPP_SERVICE_PRICING_RATE_CARD_URL =
  'https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing#rate-cards-effective-october-1-2026';

export function WhatsAppPricingLabel({
  service,
  pricing,
}: {
  service?: string;
  pricing?: WhatsAppReceiptPricing;
}) {
  if (service !== 'whatsapp') return null;

  const label =
    pricing?.billable &&
    pricing.category === 'service'
      ? 'Service'
      : 'Free';

  return (
    <span className="inline-flex items-center gap-1">
      <Circle className="size-1 fill-current" aria-hidden="true" />
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex size-3.5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="About WhatsApp service pricing"
          >
            <Info className="size-3" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-72 leading-relaxed">
          <span>{WHATSAPP_SERVICE_PRICING_TOOLTIP}</span>{' '}
          <a
            href={WHATSAPP_SERVICE_PRICING_RATE_CARD_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            View Meta's rate card.
          </a>
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
