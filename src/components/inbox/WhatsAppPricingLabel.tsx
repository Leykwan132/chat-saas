import { Info } from 'lucide-react';
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
  servicePriceMyr?: string;
  recordedAt: number;
};

export const WHATSAPP_SERVICE_PRICING_TOOLTIP =
  'Starting 1 October, Meta includes 1,000 free WhatsApp service messages each month. After that, service messages are charged. Add a payment method in Meta Business Manager to keep sending WhatsApp messages with Kilobot.';

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
    pricing.category === 'service' &&
    pricing.servicePriceMyr !== undefined
      ? `Service (RM${pricing.servicePriceMyr})`
      : 'Free';

  return (
    <span className="inline-flex items-center gap-0.5">
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
          {WHATSAPP_SERVICE_PRICING_TOOLTIP}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
