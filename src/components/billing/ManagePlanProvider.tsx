import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useAction, useQuery } from 'convex/react';
import { Bot, MessagesSquare, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  buildManagePlanReturnPath,
  resolveManagePlanStep,
  resolveTeamWarningAction,
} from '@/components/billing/managePlanFlow';
import {
  ManagePlanContext,
  type ManagePlanContextValue,
} from '@/components/billing/managePlanContext';

export function ManagePlanProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading || !user ? 'skip' : {},
  );
  const createPortal = useAction(api.stripe.createPortal);
  const [warningOpen, setWarningOpen] = useState(false);
  const [isManagePlanLoading, setIsManagePlanLoading] = useState(false);

  const openPortal = useCallback(async () => {
    if (isManagePlanLoading) return;
    setIsManagePlanLoading(true);
    try {
      const session = await createPortal({
        returnPath: buildManagePlanReturnPath(
          window.location.pathname,
          window.location.search,
        ),
      });
      if (!session?.url) {
        toast.error('Could not load billing portal.');
        return;
      }
      window.location.assign(session.url);
    } catch (error: unknown) {
      console.error('Portal error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to open customer portal.';
      toast.error(message);
    } finally {
      setIsManagePlanLoading(false);
    }
  }, [createPortal, isManagePlanLoading]);

  const openManagePlan = useCallback(() => {
    if (!planAndUsage) {
      toast.error('Your billing profile is not available yet.');
      return;
    }
    if (!planAndUsage.canManageBilling) {
      toast.error('Only the workspace owner can manage this plan.');
      return;
    }
    if (resolveManagePlanStep(planAndUsage.isTeam) === 'warn_team') {
      setWarningOpen(true);
      return;
    }
    void openPortal();
  }, [openPortal, planAndUsage]);

  const handleWarningAction = (
    action: 'continue' | 'go_back',
  ) => {
    if (resolveTeamWarningAction(action) === 'close_warning') {
      setWarningOpen(false);
      return;
    }
    void openPortal();
  };

  const value = useMemo<ManagePlanContextValue>(
    () => ({ openManagePlan, isManagePlanLoading }),
    [isManagePlanLoading, openManagePlan],
  );

  return (
    <ManagePlanContext.Provider value={value}>
      {children}
      <Dialog
        open={warningOpen}
        onOpenChange={(open) => {
          if (!isManagePlanLoading) setWarningOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage your team plan</DialogTitle>
            <DialogDescription>
              If you switch this team to Free in Stripe, the workspace and its
              data will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <WarningItem
              icon={MessagesSquare}
              text="Conversations and contacts will be deleted"
            />
            <WarningItem
              icon={Bot}
              text="Agents and their threads will be deleted"
            />
            <WarningItem
              icon={Unplug}
              text="Connected channels will be disconnected"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleWarningAction('go_back')}
              disabled={isManagePlanLoading}
            >
              Go back
            </Button>
            <Button
              type="button"
              onClick={() => handleWarningAction('continue')}
              disabled={isManagePlanLoading}
            >
              {isManagePlanLoading ? <Spinner /> : null}
              Continue anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ManagePlanContext.Provider>
  );
}

function WarningItem({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span>{text}</span>
    </div>
  );
}
