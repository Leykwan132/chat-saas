import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Check, Equal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

type WorkflowFollowupCostCalculatorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId?: string;
  canManage: boolean;
};

const MARKETING_RATE_MYR = 0.3467;

const CUSTOMER_STEPS = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
  2000, 3000, 4000, 5000, 10000, 15000, 20000, 25000, 50000, 75000, 100000,
];

export function WorkflowFollowupCostCalculatorDialog({
  open,
  onOpenChange,
  agentId,
  canManage,
}: WorkflowFollowupCostCalculatorDialogProps) {
  const [calculatorCustomersIndex, setCalculatorCustomersIndex] = useState(13);
  const [calculatorFollowUps, setCalculatorFollowUps] = useState(3);
  const calculatorCustomers = CUSTOMER_STEPS[calculatorCustomersIndex];
  const estimatedPrice = calculatorCustomers * calculatorFollowUps * MARKETING_RATE_MYR;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border border-border/60 bg-white p-8 sm:max-w-[680px] dark:bg-[#121212]">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-3xl font-semibold tracking-tight text-foreground">
            Cost Calculator
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5">
            <CalculatorSlider
              title="Number of Customers"
              value={calculatorCustomers.toLocaleString()}
              unit={calculatorCustomers === 1 ? 'customer' : 'customers'}
              sliderValue={calculatorCustomersIndex}
              min={0}
              max={CUSTOMER_STEPS.length - 1}
              rangeStart="100"
              rangeEnd="100k"
              onValueChange={setCalculatorCustomersIndex}
            />
            <CalculatorSlider
              title="Number of Follow-ups"
              value={String(calculatorFollowUps)}
              unit={calculatorFollowUps === 1 ? 'follow-up' : 'follow-ups'}
              sliderValue={calculatorFollowUps}
              min={1}
              max={5}
              rangeStart="1"
              rangeEnd="5"
              onValueChange={setCalculatorFollowUps}
            />
          </div>

          <div className="flex flex-col gap-6 rounded-3xl border border-border bg-white p-6 dark:bg-[#1a1a1a]">
            <div className="flex items-start justify-between">
              <CalculatorMetric
                value={(calculatorCustomers * calculatorFollowUps).toLocaleString()}
                label="Total Messages"
              />
              <X className="mt-[5px] size-3.5 shrink-0 text-muted-foreground/50" />
              <CalculatorMetric value="~ RM 0.3467" label="Est. Rate / Msg" />
              <Equal className="mt-[5px] size-3.5 shrink-0 text-muted-foreground/50" />
              <CalculatorMetric
                value={`~ RM ${estimatedPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
                label="Est. Total Cost"
                large
              />
            </div>

            <div className="border-t border-border/60 pt-4">
              <p className="text-sm leading-relaxed text-foreground">
                We will follow up on <strong className="font-semibold">{calculatorCustomers.toLocaleString()}</strong> customers, maximum <strong className="font-semibold">{calculatorFollowUps}</strong> times.
              </p>
            </div>

            {canManage ? (
              <Button asChild className="h-11 w-full rounded-xl bg-[#1a1a1a] text-sm font-semibold text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                <Link to={`/dashboard/${agentId}/workflow`} onClick={() => onOpenChange(false)}>
                  Get started
                </Link>
              </Button>
            ) : (
              <Button disabled className="h-11 w-full rounded-xl text-sm font-semibold">
                Get started
              </Button>
            )}

            <ul className="flex flex-col gap-2.5 pt-2">
              <CalculatorNote>
                See{' '}
                <a
                  href="https://whatsappbusiness.com/products/platform-pricing/?country=Malaysia&currency=Malaysian%20Ringgit%20(MYR)&category=Marketing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-semibold text-foreground hover:underline"
                >
                  Official WhatsApp Pricing
                </a>{' '}
                here.
              </CalculatorNote>
              <CalculatorNote>RM0 platform fee - pay exactly what Meta charges you</CalculatorNote>
              <CalculatorNote>Billed directly by Meta (no payment through Kilobot)</CalculatorNote>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CalculatorSlider({
  title,
  value,
  unit,
  sliderValue,
  min,
  max,
  rangeStart,
  rangeEnd,
  onValueChange,
}: {
  title: string;
  value: string;
  unit: string;
  sliderValue: number;
  min: number;
  max: number;
  rangeStart: string;
  rangeEnd: string;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white">
            {value}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">{unit}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Slider
          value={[sliderValue]}
          onValueChange={(nextValue) => onValueChange(nextValue[0])}
          min={min}
          max={max}
          step={1}
        />
        <div className="mt-0.5 flex justify-between text-xs font-semibold text-muted-foreground/80">
          <span>{rangeStart}</span>
          <span>{rangeEnd}</span>
        </div>
      </div>
    </div>
  );
}

function CalculatorMetric({
  value,
  label,
  large = false,
}: {
  value: string;
  label: string;
  large?: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-col">
      <span className={`${large ? 'text-3xl' : 'text-lg'} whitespace-nowrap font-semibold tracking-tight text-neutral-950 dark:text-white`}>
        {value}
      </span>
      <span className="mt-1 whitespace-nowrap text-xs text-muted-foreground/80">
        {label}
      </span>
    </div>
  );
}

function CalculatorNote({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
      <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-foreground">
        <Check className="size-3 stroke-[2.5]" />
      </div>
      <span>{children}</span>
    </li>
  );
}
