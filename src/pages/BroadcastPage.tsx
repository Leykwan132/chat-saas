import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { SiWhatsapp } from 'react-icons/si';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BroadcastOverviewDialog,
  OVERVIEW_VARIANT_META,
} from '@/components/WhatsAppFeatureOverviewDialog';
import {
  BAN_GUIDE_META,
  WhatsAppBanGuideDialog,
} from '@/components/WhatsAppBanGuideDialog';
import { useMutation, usePaginatedQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { WhatsAppFeatureGate } from '@/components/WhatsAppFeatureGate';
import { BroadcastHistoryTable } from '@/components/broadcast/BroadcastHistoryTable';
import { BROADCAST_HISTORY_PAGE_SIZE } from '@/components/broadcast/broadcastHistoryPagination';
import { BroadcastGuideCard } from '@/components/broadcast/BroadcastGuideCard';
import { BroadcastCostCalculatorDialog } from '@/components/broadcast/BroadcastCostCalculatorDialog';

export default function BroadcastPage() {
  const { agentId } = useParams();
  const { can } = usePermissions();
  const canManage = can(Permission.BROADCAST_MANAGE);

  const { results: schedules, status, loadMore } = usePaginatedQuery(
    api.whatsappBroadcast.listSchedulesForAgent,
    { agentId: agentId as Id<'agents'> },
    { initialNumItems: BROADCAST_HISTORY_PAGE_SIZE },
  );
  const deleteSchedule = useMutation(api.whatsappBroadcast.deleteScheduleRecord);

  const [deletingIds, setDeletingIds] = useState<
    Id<'whatsappBroadcastSchedules'>[]
  >([]);

  const handleDelete = async (
    scheduleId: Id<'whatsappBroadcastSchedules'>,
  ) => {
    setDeletingIds((prev) => [...prev, scheduleId]);
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      await deleteSchedule({ scheduleId });
      toast.success('Broadcast campaign record deleted successfully.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Failed to delete: ${msg}`);
      setDeletingIds((prev) => prev.filter((id) => id !== scheduleId));
    }
  };

  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [isBanGuideOpen, setIsBanGuideOpen] = useState(false);
  const [banGuideStep, setBanGuideStep] = useState(0);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [targetSchedule, setTargetSchedule] = useState<{
    id: Id<'whatsappBroadcastSchedules'>;
    isPending: boolean;
  } | null>(null);

  return (
    <WhatsAppFeatureGate feature="Broadcast">
      <div data-broadcast-page className="flex w-full flex-col gap-8">
        <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              <SiWhatsapp className="size-3 text-[#25D366]" />
              WhatsApp only
            </span>
          </div>
          <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground">Broadcast</h1>
        </div>
        {canManage && (
          <div className="flex shrink-0">
            <Button asChild className="gap-1.5 font-semibold">
              <Link to={`/dashboard/${agentId}/broadcast/new`}>
                <Plus data-icon="inline-start" />
                New broadcast
              </Link>
            </Button>
          </div>
        )}
        </header>

        <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Guides</h2>
        <div className="flex flex-wrap items-end gap-6 max-w-[920px]">
          <BroadcastGuideCard
            tag={OVERVIEW_VARIANT_META.broadcast.tag}
            title={OVERVIEW_VARIANT_META.broadcast.bookTitle}
            onClick={() => {
              setWalkthroughStep(0);
              setIsWalkthroughOpen(true);
            }}
          />

          <BroadcastGuideCard
            tag={BAN_GUIDE_META.tag}
            title={BAN_GUIDE_META.bookTitle}
            onClick={() => {
              setBanGuideStep(0);
              setIsBanGuideOpen(true);
            }}
          />

          <BroadcastGuideCard
            tag="Calculator"
            title="Cost Calculator"
            onClick={() => setIsCalculatorOpen(true)}
          />

        </div>
        </section>

      <BroadcastHistoryTable
        agentId={agentId as Id<'agents'>}
        schedules={schedules}
        status={status}
        loadMore={loadMore}
        canManage={canManage}
        deletingIds={deletingIds}
        onDeleteRequest={(schedule) => {
          setTargetSchedule(schedule);
          setConfirmDialogOpen(true);
        }}
      />

      <BroadcastOverviewDialog
        open={isWalkthroughOpen}
        onOpenChange={setIsWalkthroughOpen}
        step={walkthroughStep}
        onStepChange={setWalkthroughStep}
        ctaHref={canManage ? `/dashboard/${agentId}/broadcast/new` : undefined}
      />

      <WhatsAppBanGuideDialog
        open={isBanGuideOpen}
        onOpenChange={setIsBanGuideOpen}
        step={banGuideStep}
        onStepChange={setBanGuideStep}
      />

      <BroadcastCostCalculatorDialog
        open={isCalculatorOpen}
        onOpenChange={setIsCalculatorOpen}
        agentId={agentId as Id<'agents'>}
        canManage={canManage}
      />

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="rounded-3xl bg-white dark:bg-[#121212] border border-border/60 p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              {targetSchedule?.isPending ? 'Cancel broadcast' : 'Delete broadcast history'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              {targetSchedule?.isPending
                ? 'Are you sure you want to cancel this scheduled broadcast? This action cannot be undone.'
                : 'Are you sure you want to delete this broadcast record from your history? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setTargetSchedule(null);
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (targetSchedule) {
                  await handleDelete(targetSchedule.id);
                  setConfirmDialogOpen(false);
                  setTargetSchedule(null);
                }
              }}
              className="rounded-xl"
            >
              {targetSchedule?.isPending ? 'Confirm cancel' : 'Confirm delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes row-delete {
          0% {
            opacity: 1;
            transform: translateX(0);
            background-color: rgba(239, 68, 68, 0.05);
          }
          30% {
            background-color: rgba(239, 68, 68, 0.12);
          }
          100% {
            opacity: 0;
            transform: translateX(-20px);
            background-color: rgba(239, 68, 68, 0);
          }
        }
        .animate-row-delete {
          animation: row-delete 350ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
      </div>
    </WhatsAppFeatureGate>
  );
}
