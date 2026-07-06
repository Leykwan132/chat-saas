import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { pricingTableShellClass } from '@/components/pricing/pricingStyles';
import { fieldClass } from './adminContactModel';

export function AdminAuthPanel({
  step,
  email,
  code,
  isSubmitting,
  onEmailChange,
  onCodeChange,
  onEmailSubmit,
  onCodeSubmit,
  onBack,
}: {
  step: 'email' | 'code';
  email: string;
  code: string;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onEmailSubmit: () => void;
  onCodeSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <Link to="/" className="group flex flex-col items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex size-12 items-center justify-center rounded-xl border border-border/70 bg-card shadow-none">
            <img src="/icon.svg" className="size-7 dark:invert" alt="" />
          </div>
          <span className="font-title text-xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Kilobot
          </span>
        </Link>
      </div>

      <div
        className={cn(
          pricingTableShellClass,
          'border-zinc-200 bg-white p-6 dark:border-white/[0.08] dark:bg-white/[0.02] sm:p-8',
        )}
      >
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
            Admin access
          </h1>
          <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {step === 'email'
              ? 'Enter your admin email to continue.'
              : 'Enter the six-digit admin code to view the admin dashboard.'}
          </p>
          {step === 'code' && email.trim() ? (
            <p className="text-xs text-muted-foreground">{email.trim()}</p>
          ) : null}
        </div>

        {step === 'email' ? (
          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              onEmailSubmit();
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Email
              </span>
              <Input
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="you@company.com"
                className={fieldClass}
                autoComplete="email"
              />
            </label>
            <Button type="submit" disabled={isSubmitting} className="h-9 w-full rounded-lg">
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              Continue
            </Button>
          </form>
        ) : (
          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              onCodeSubmit();
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Admin code
              </span>
              <Input
                type="password"
                inputMode="numeric"
                value={code}
                onChange={(event) => onCodeChange(event.target.value)}
                placeholder="000000"
                className={fieldClass}
                autoComplete="one-time-code"
              />
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                Enter admin
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
