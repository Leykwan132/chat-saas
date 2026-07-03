import { useQuery } from 'convex/react';
import { Coins } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  EXTRA_CREDITS_PACK_NOTE,
  EXTRA_CREDITS_PACKS,
  formatExtraCreditsPackPrice,
  type ExtraCreditsPackId,
} from '../../../shared/planCatalog';

type PlanAddOnsSectionProps = {
  loadingCreditsPackId: ExtraCreditsPackId | null;
  onCreditsCheckout: (extraCreditsPackId: ExtraCreditsPackId) => void;
};

function formatPurchaseDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatHistoryPrice(priceRm: number | null) {
  return priceRm === null ? null : `RM ${priceRm.toLocaleString()}`;
}

export function PlanAddOnsSection({
  loadingCreditsPackId,
  onCreditsCheckout,
}: PlanAddOnsSectionProps) {
  const purchaseHistory = useQuery(api.billingAddOns.listAddOnPurchaseHistory, {});
  const visiblePurchaseHistory = purchaseHistory ?? [];

  return (
    <div id="plan-add-ons" className="scroll-mt-6">
      <h3 className="text-sm font-semibold text-foreground">Add-ons</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        One-time purchases on top of your subscription.
      </p>
      <div className="mt-4 grid w-full max-w-[56rem] grid-cols-1 gap-4 md:grid-cols-3">
        {EXTRA_CREDITS_PACKS.map((pack) => (
          <Card
            key={pack.id}
            className="w-full rounded-xl border border-border bg-card py-0 shadow-none ring-0"
          >
            <CardHeader className="flex h-full flex-col rounded-none px-5 py-5">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Coins className="size-3.5 text-muted-foreground" />
                {pack.credits.toLocaleString()} credits
              </p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-normal tracking-tight text-foreground">
                  {formatExtraCreditsPackPrice(pack)}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {EXTRA_CREDITS_PACK_NOTE}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-8 h-9 w-full rounded-lg text-sm font-medium"
                onClick={() => onCreditsCheckout(pack.id)}
                disabled={loadingCreditsPackId !== null}
              >
                {loadingCreditsPackId === pack.id ? (
                  <Spinner className="size-3.5" />
                ) : (
                  'Select'
                )}
              </Button>
            </CardHeader>
          </Card>
        ))}
      </div>

      {visiblePurchaseHistory.length > 0 ? (
        <section className="mt-6 w-full max-w-[56rem]">
          <h4 className="text-sm font-semibold text-foreground">Add-on purchase history</h4>
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border/60">
              {visiblePurchaseHistory.map((purchase) => {
                const price = formatHistoryPrice(purchase.priceRm);
                return (
                  <li
                    key={purchase.id}
                    className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="text-sm font-normal text-muted-foreground">
                        {formatPurchaseDate(purchase.purchasedAt)}
                      </p>
                      <p className="text-sm font-normal text-foreground">
                        {purchase.credits.toLocaleString()} credits
                      </p>
                    </div>
                    {price ? (
                      <p className="text-sm font-normal text-foreground sm:shrink-0 sm:text-right">
                        - {price}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
