import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ENTERPRISE_PRICING_BANNER } from '../../../shared/planCatalog';
import { pricingTableShellClass } from './pricingStyles';
import type { PlanPickerDensity } from './pricingStyles';

export function PricingEnterpriseBanner({
  className,
  density = 'default',
}: {
  className?: string;
  density?: PlanPickerDensity;
}) {
  const isCompact = density === 'compact';

  return (
    <div
      className={cn(
        pricingTableShellClass,
        'border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black',
        isCompact ? 'px-4 py-2.5 sm:px-5' : 'px-6 py-5 sm:px-8',
        className,
      )}
    >
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <p
          className={cn(
            'font-medium text-white',
            isCompact ? 'text-xs sm:text-sm' : 'text-base sm:text-lg',
          )}
        >
          {ENTERPRISE_PRICING_BANNER.message}
        </p>
        <Button
          asChild
          className={cn(
            'shrink-0 rounded-lg border-0 bg-white font-medium text-zinc-950 shadow-sm hover:bg-zinc-100',
            isCompact ? 'h-7 px-3 text-xs' : 'h-9 px-5 text-sm',
          )}
        >
          <Link to="/contact?intent=enterprise">{ENTERPRISE_PRICING_BANNER.actionLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
