import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { format } from 'date-fns';
import { Filter, LogOut } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { pricingTableShellClass } from '@/components/pricing/pricingStyles';
import { isValidEmailFormat } from '../../shared/emailValidation';

const SESSION_STORAGE_KEY = 'adminContactSession';

type ContactStatus = 'unread' | 'seen' | 'replied' | 'closed';
type ContactIntent = 'enterprise' | 'support' | 'demo';
type StatusFilter = 'all' | ContactStatus;
type IntentFilter = 'all' | ContactIntent;

type AdminSession = {
  token: string;
  expiresAt: number;
};

const intentLabels: Record<ContactIntent, string> = {
  enterprise: 'Enterprise plan',
  support: 'Support',
  demo: 'Schedule a demo',
};

const statusLabels: Record<ContactStatus, string> = {
  unread: 'Unread',
  seen: 'Seen',
  replied: 'Replied',
  closed: 'Closed',
};

const statusFilterLabels: Record<StatusFilter, string> = {
  all: 'All statuses',
  unread: 'Unread',
  seen: 'Seen',
  replied: 'Replied',
  closed: 'Closed',
};

const intentFilterLabels: Record<IntentFilter, string> = {
  all: 'All intents',
  enterprise: 'Enterprise plan',
  support: 'Support',
  demo: 'Schedule a demo',
};

const fieldClass =
  'h-9 w-full rounded-lg border border-transparent bg-input/50 px-3 text-sm shadow-none';

const contactTableGridClass =
  'grid grid-cols-[minmax(140px,1fr)_minmax(120px,1fr)_minmax(160px,1.2fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(120px,0.9fr)_minmax(160px,1fr)] items-center gap-x-6 px-8';

function loadStoredSession(): AdminSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed.token || !parsed.expiresAt) {
      return null;
    }
    if (parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function storeSession(session: AdminSession) {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

function statusBadgeClass(status: ContactStatus) {
  switch (status) {
    case 'unread':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'seen':
      return 'bg-sky-500/10 text-sky-700 dark:text-sky-300';
    case 'replied':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'closed':
      return 'bg-muted text-muted-foreground';
  }
}

function ContactTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="border-b border-dotted border-border/60">
          <div className={cn(contactTableGridClass, 'py-4')}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mx-auto h-6 w-16 rounded-lg" />
            <Skeleton className="mx-auto h-9 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </>
  );
}

function AuthPanel({
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
        <Link
          to="/"
          className="group flex flex-col items-center gap-3 transition-opacity hover:opacity-80"
        >
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
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
            Admin access
          </h1>
          <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {step === 'email'
              ? 'Enter your admin email to continue.'
              : 'Enter the six-digit admin code to view contact requests.'}
          </p>
          {step === 'code' && email.trim() ? (
            <p className="text-xs text-muted-foreground">{email.trim()}</p>
          ) : null}
        </div>

        {step === 'email' ? (
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              onEmailSubmit();
            }}
          >
            <label className="block space-y-2">
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
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 w-full rounded-lg bg-zinc-950 text-white hover:bg-zinc-900"
            >
              {isSubmitting ? <Spinner className="size-4" /> : 'Continue'}
            </Button>
          </form>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              onCodeSubmit();
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Admin code
              </span>
              <Input
                type="password"
                inputMode="numeric"
                value={code}
                onChange={(event) => onCodeChange(event.target.value)}
                placeholder="••••••"
                className={fieldClass}
                autoComplete="one-time-code"
              />
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isSubmitting}
                className="h-9 rounded-lg"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 flex-1 rounded-lg bg-zinc-950 text-white hover:bg-zinc-900"
              >
                {isSubmitting ? <Spinner className="size-4" /> : 'Enter dashboard'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminContactPage() {
  const convex = useConvex();
  const authenticateAdmin = useMutation(api.contactAdminAuth.authenticateAdmin);
  const logoutAdmin = useMutation(api.contactAdminAuth.logoutAdmin);
  const updateContactRequestStatus = useMutation(api.contactAdmin.updateContactRequestStatus);

  const [session, setSession] = useState<AdminSession | null>(() => loadStoredSession());
  const [authStep, setAuthStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [intentFilter, setIntentFilter] = useState<IntentFilter>('all');
  const [visibleContactIds, setVisibleContactIds] = useState<Set<Id<'contactRequests'>>>(
    () => new Set(),
  );

  const sessionToken = session?.token ?? '';
  const isAuthenticated = Boolean(sessionToken);

  const sessionValidation = useQuery(
    api.contactAdminAuth.validateAdminSession,
    isAuthenticated ? { sessionToken } : 'skip',
  );

  const countsResult = useQuery(
    api.contactAdmin.getContactRequestCounts,
    isAuthenticated && sessionValidation?.valid ? { sessionToken } : 'skip',
  );

  const requests = useQuery(
    api.contactAdmin.listContactRequests,
    isAuthenticated && sessionValidation?.valid
      ? {
          sessionToken,
          status: statusFilter === 'all' ? undefined : statusFilter,
          intent: intentFilter === 'all' ? undefined : intentFilter,
        }
      : 'skip',
  );

  const handleLogout = async () => {
    if (sessionToken) {
      try {
        await logoutAdmin({ sessionToken });
      } catch {
        // Ignore logout failures and clear local session anyway.
      }
    }

    clearStoredSession();
    setSession(null);
    setAuthStep('email');
    setEmail('');
    setCode('');
    setStatusFilter('all');
    setIntentFilter('all');
    setVisibleContactIds(new Set());
  };

  useEffect(() => {
    if (!isAuthenticated || sessionValidation === undefined || sessionValidation.valid) {
      return;
    }

    clearStoredSession();
    setSession(null);
    setAuthStep('email');
    setEmail('');
    setCode('');
    toast.error('Your admin session expired. Please sign in again.');
  }, [isAuthenticated, sessionValidation]);

  const isTableLoading =
    sessionValidation === undefined ||
    (sessionValidation.valid && requests === undefined);

  const hasActiveFilters = statusFilter !== 'all' || intentFilter !== 'all';
  const filteredContactCount = requests?.length ?? 0;

  const handleEmailSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Please enter your email.');
      return;
    }
    if (!isValidEmailFormat(trimmedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const result = await convex.query(api.contactAdminAuth.checkAdminEmail, {
        email: trimmedEmail,
      });
      if (!result.allowed) {
        toast.error('This email is not authorized for admin access.');
        return;
      }
      setAuthStep('code');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to verify email.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCodeSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();

    if (!trimmedEmail) {
      toast.error('Please enter your email.');
      setAuthStep('email');
      return;
    }
    if (!isValidEmailFormat(trimmedEmail)) {
      toast.error('Please enter a valid email address.');
      setAuthStep('email');
      return;
    }
    if (!trimmedCode) {
      toast.error('Please enter the admin code.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const result = await authenticateAdmin({
        email: trimmedEmail,
        code: trimmedCode,
      });
      const nextSession = {
        token: result.token,
        expiresAt: result.expiresAt,
      };
      storeSession(nextSession);
      setSession(nextSession);
      setCode('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleStatusChange = async (
    requestId: Id<'contactRequests'>,
    status: ContactStatus,
  ) => {
    if (!sessionToken) {
      return;
    }

    try {
      await updateContactRequestStatus({
        sessionToken,
        requestId,
        status,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status.');
    }
  };

  const toggleContactVisibility = (requestId: Id<'contactRequests'>) => {
    setVisibleContactIds((current) => {
      const next = new Set(current);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setIntentFilter('all');
  };

  const filterCounts = useMemo(() => {
    const counts = countsResult?.counts;
    if (!counts) {
      return null;
    }

    return {
      all: countsResult.total,
      unread: counts.unread,
      seen: counts.seen,
      replied: counts.replied,
      closed: counts.closed,
    };
  }, [countsResult]);

  const activeFilterLabel = useMemo(() => {
    const parts: string[] = [];

    if (statusFilter !== 'all') {
      parts.push(statusFilterLabels[statusFilter]);
    }
    if (intentFilter !== 'all') {
      parts.push(intentFilterLabels[intentFilter]);
    }

    return parts.length > 0 ? parts.join(', ') : 'Filter';
  }, [statusFilter, intentFilter]);

  if (!isAuthenticated || sessionValidation?.valid === false) {
    return (
      <div className="flex min-h-[100svh] flex-col bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-[#060606] dark:text-zinc-100">
        <main className="flex flex-1 items-center justify-center px-5 py-16 sm:px-6">
          <AuthPanel
            step={authStep}
            email={email}
            code={code}
            isSubmitting={isAuthenticating}
            onEmailChange={setEmail}
            onCodeChange={setCode}
            onEmailSubmit={() => void handleEmailSubmit()}
            onCodeSubmit={() => void handleCodeSubmit()}
            onBack={() => setAuthStep('email')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-[#060606] dark:text-zinc-100">
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-title text-4xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-5xl">
              Contact requests
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Review inbound support, demo, and enterprise requests in one place.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleLogout()}
              className="h-9 rounded-lg"
            >
              <LogOut className="size-4" />
              Log out
            </Button>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="h-9 w-fit gap-2 rounded-lg px-3">
                <Filter className="size-4 shrink-0" />
                <span>{activeFilterLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto min-w-56 p-4">
              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(statusFilterLabels) as StatusFilter[]).map((filter) => {
                        const count = filterCounts?.[filter];

                        return (
                          <SelectItem key={filter} value={filter}>
                            {statusFilterLabels[filter]}
                            {typeof count === 'number' ? ` (${count})` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Intent</span>
                  <Select
                    value={intentFilter}
                    onValueChange={(value) => setIntentFilter(value as IntentFilter)}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg">
                      <SelectValue placeholder="All intents" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(intentFilterLabels) as IntentFilter[]).map((filter) => (
                        <SelectItem key={filter} value={filter}>
                          {intentFilterLabels[filter]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 text-muted-foreground"
            disabled={!hasActiveFilters}
            onClick={handleResetFilters}
          >
            Reset
          </Button>
        </div>

        <div className={cn(pricingTableShellClass, 'mt-6')}>
          <div className="overflow-x-auto">
            <div className="min-w-[1040px] w-full">
              <div
                className={cn(
                  contactTableGridClass,
                  'border-b border-border/70 py-5 text-left text-sm font-medium text-muted-foreground',
                )}
              >
                <div>Received</div>
                <div>Intent</div>
                <div>Contact</div>
                <div>Company</div>
                <div>Company size</div>
                <div className="text-center">Status</div>
                <div className="text-center">Actions</div>
              </div>

              {isTableLoading ? (
                <ContactTableSkeleton />
              ) : filteredContactCount === 0 ? (
                <div className="px-8 py-10 text-center text-sm text-muted-foreground/45">
                  {hasActiveFilters
                    ? 'No contact requests match these filters.'
                    : 'No contact requests yet.'}
                </div>
              ) : (
                (requests ?? []).map((request) => (
                  <div key={request._id} className="border-b border-dotted border-border/60">
                    <div className={cn(contactTableGridClass, 'py-4 text-left text-sm text-foreground')}>
                      <div>{format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}</div>
                      <div>{intentLabels[request.intent]}</div>
                      <div>
                        {visibleContactIds.has(request._id) ? (
                          <div className="mb-2 space-y-1">
                            <div>{request.email}</div>
                            {request.contactName ? (
                              <div className="text-xs text-muted-foreground">
                                {request.contactName}
                              </div>
                            ) : null}
                            {request.contactNumber ? (
                              <div className="text-xs text-muted-foreground">
                                {request.contactNumber}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => toggleContactVisibility(request._id)}
                          className="h-9 rounded-lg"
                        >
                          {visibleContactIds.has(request._id) ? 'Hide contact' : 'View contact'}
                        </Button>
                      </div>
                      <div>
                        {request.companyName ?? request.company ?? (
                          <span className="text-muted-foreground/45">—</span>
                        )}
                      </div>
                      <div>
                        {request.numberOfUsers ?? (
                          <span className="text-muted-foreground/45">—</span>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <Badge
                          variant="outline"
                          className={cn('rounded-lg', statusBadgeClass(request.status))}
                        >
                          {statusLabels[request.status]}
                        </Badge>
                      </div>
                      <div className="flex justify-center">
                        <Select
                          value={request.status}
                          onValueChange={(value) =>
                            void handleStatusChange(request._id, value as ContactStatus)
                          }
                        >
                          <SelectTrigger className="h-9 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(statusLabels) as ContactStatus[]).map((status) => (
                              <SelectItem key={status} value={status}>
                                {statusLabels[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 px-1">
          {isTableLoading ? (
            <Skeleton className="h-4 w-28" />
          ) : (
            <p className="text-sm text-muted-foreground">
              {filteredContactCount}{' '}
              {filteredContactCount === 1 ? 'contact' : 'contacts'}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
