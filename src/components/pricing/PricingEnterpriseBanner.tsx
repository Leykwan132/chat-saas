import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ENTERPRISE_PRICING_BANNER } from '../../../shared/planCatalog';
import { pricingTableShellClass } from './pricingStyles';

export function PricingEnterpriseBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        pricingTableShellClass,
        'border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black px-6 py-5 sm:px-8',
        className,
      )}
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-base font-medium text-white sm:text-lg">
          {ENTERPRISE_PRICING_BANNER.message}
        </p>
        <Button
          asChild
          className="h-9 shrink-0 rounded-lg border-0 bg-white px-5 text-sm font-medium text-zinc-950 shadow-sm hover:bg-zinc-100"
        >
          <Link to="/contact?intent=enterprise">{ENTERPRISE_PRICING_BANNER.actionLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
