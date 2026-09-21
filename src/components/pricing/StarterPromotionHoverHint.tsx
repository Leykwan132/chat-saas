import { Info } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

export function StarterPromotionHoverHint() {
  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label="About the Starter promotion"
          className="inline-flex size-3.5 items-center justify-center rounded-full text-amber-900/70 transition-colors hover:text-amber-900 dark:text-amber-200/70 dark:hover:text-amber-200"
        >
          <Info className="size-3" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72">
        <p className="font-medium">Starter promotion</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Get Starter for RM1/month for your first 3 months with code STARTER1 at checkout.
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
