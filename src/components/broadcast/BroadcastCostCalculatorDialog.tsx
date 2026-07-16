import { useState } from 'react';
import { Link } from 'react-router';
import { Check, ChevronRight, Equal, X } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

const MARKETING_RATE_MYR = 0.3467;
const CUSTOMER_STEPS = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000, 4000,
  5000, 10000, 15000, 20000, 25000, 50000, 75000, 100000,
];

export function BroadcastCostCalculatorDialog({
  open,
  onOpenChange,
  agentId,
  canManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: Id<'agents'>;
  canManage: boolean;
}) {
  const [customersIndex, setCustomersIndex] = useState(13);
  const customers = CUSTOMER_STEPS[customersIndex];
  const estimatedPrice = customers * MARKETING_RATE_MYR;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border border-border/60 bg-white p-8 sm:max-w-[680px] dark:bg-[#121212]">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-3xl font-semibold tracking-tight text-foreground">
            Cost Calculator
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Number of Customers
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight text-foreground">
                  {customers.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {customers === 1 ? 'customer' : 'customers'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Slider
                value={[customersIndex]}
                onValueChange={(value) => setCustomersIndex(value[0])}
                min={0}
                max={CUSTOMER_STEPS.length - 1}
                step={1}
              />
              <div className="mt-0.5 flex justify-between text-xs font-semibold text-muted-foreground/80">
                <span>100</span>
                <span>100k</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6 rounded-3xl border border-border bg-white p-6 dark:bg-[#1a1a1a]">
            <div className="flex items-start justify-between">
              <div className="flex shrink-0 flex-col">
                <span className="whitespace-nowrap text-lg font-medium tracking-tight text-foreground">
                  {customers.toLocaleString()}
                </span>
                <span className="mt-1 whitespace-nowrap text-xs text-muted-foreground/80">
                  Total Messages
                </span>
              </div>
              <X className="size-3.5 shrink-0 text-muted-foreground/60" />
              <div className="flex shrink-0 flex-col">
                <span className="whitespace-nowrap text-lg font-medium tracking-tight text-foreground">
                  ~ RM 0.3467
                </span>
                <span className="mt-1 whitespace-nowrap text-xs text-muted-foreground/80">
                  Est. Rate / Msg
                </span>
              </div>
              <Equal className="size-3.5 shrink-0 text-muted-foreground/60" />
              <div className="flex shrink-0 flex-col items-end">
                <span className="whitespace-nowrap text-3xl font-semibold tracking-tight text-foreground">
                  ~ RM{' '}
                  {estimatedPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
                  Est. Total Cost
                </span>
              </div>
            </div>
            <div className="border-t border-border/60 pt-4">
              <p className="text-sm leading-relaxed text-foreground">
                We will broadcast to{' '}
                <strong className="font-semibold">
                  {customers.toLocaleString()}
                </strong>{' '}
                customers.
              </p>
            </div>
            {canManage ? (
              <Button asChild className="h-11 w-full rounded-xl text-sm font-semibold">
                <Link
                  to={`/dashboard/${agentId}/broadcast/new`}
                  onClick={() => onOpenChange(false)}
                >
                  Get started
                </Link>
              </Button>
            ) : (
              <Button disabled className="h-11 w-full rounded-xl text-sm font-semibold">
                Get started
              </Button>
            )}
            <ul className="flex flex-col gap-2.5 pt-2">
              <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-foreground">
                  <Check className="size-3 stroke-[2.5]" />
                </span>
                <span>
                  Based on official WhatsApp marketing rate (RM 0.3467 / message). See{' '}
                  <a
                    href="https://whatsappbusiness.com/products/platform-pricing/?country=Malaysia&currency=Malaysian%20Ringgit%20(MYR)&category=Marketing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-semibold text-foreground hover:underline"
                  >
                    Official WhatsApp Pricing
                    <ChevronRight className="size-2.5" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-foreground">
                  <Check className="size-3 stroke-[2.5]" />
                </span>
                <span>RM0 platform fee — pay exactly what Meta charges you</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-foreground">
                  <Check className="size-3 stroke-[2.5]" />
                </span>
                <span>Billed directly by Meta (no payment through Kilobot)</span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
