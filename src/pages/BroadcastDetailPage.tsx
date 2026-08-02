import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { AlertCircle, ArrowLeft, LayoutList, Loader2, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { WhatsAppTemplatePreview } from '@/components/WhatsAppTemplatePreview';
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
  DetailSectionHeading,
  DetailSectionNav,
  type DetailSectionTab,
} from '@/components/automation/DetailSectionNav';
import { BroadcastDetailOverview } from '@/components/broadcast/BroadcastDetailOverview';
import { BroadcastRecipientsTable } from '@/components/broadcast/BroadcastRecipientsTable';

const BROADCAST_DETAIL_TABS: DetailSectionTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutList },
  { id: 'recipients', label: 'Recipients', icon: Users },
];

function channelLabel(ch: {
  displayPhoneNumber?: string;
  phoneNumberId?: string;
  wabaId?: string;
}): string {
  return ch.displayPhoneNumber ?? ch.phoneNumberId ?? ch.wabaId ?? 'WhatsApp';
}

export default function BroadcastDetailPage() {
  const { agentId, scheduleId } = useParams();
  const navigate = useNavigate();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const typedScheduleId = scheduleId as Id<'whatsappBroadcastSchedules'> | undefined;

  const { can } = usePermissions();
  const canManage = can(Permission.BROADCAST_MANAGE);

  const schedule = useQuery(
    api.whatsappBroadcast.getBroadcastSchedule,
    typedScheduleId ? { scheduleId: typedScheduleId } : 'skip',
  );
  const recipientRows = useQuery(
    api.whatsappBroadcast.listBroadcastScheduleRecipients,
    typedScheduleId ? { scheduleId: typedScheduleId } : 'skip',
  );
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const cancelSchedule = useMutation(api.whatsappBroadcast.cancelScheduledBatch);
  const deleteSchedule = useMutation(api.whatsappBroadcast.deleteScheduleRecord);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'cancel' | 'delete'>('delete');
  const [actionBusy, setActionBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const channel = useMemo(() => {
    if (!channels || !schedule) return null;
    return channels.find((c) => c._id === schedule.channelId) ?? null;
  }, [channels, schedule]);

  const template = useQuery(
    api.whatsappTemplateQueries.getForChannelByNameAndLanguage,
    schedule
      ? {
          channelId: schedule.channelId,
          name: schedule.templateName,
          language: schedule.templateLanguage,
        }
      : 'skip',
  );
  const templatesLoading = Boolean(schedule) && template === undefined;

  if (!typedAgentId || !typedScheduleId) {
    return <Navigate to="/workspace" replace />;
  }

  if (schedule === undefined || channels === undefined || recipientRows === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (schedule === null) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit gap-1 text-muted-foreground" asChild>
          <Link to={`/dashboard/${agentId}/broadcast`}>
            <ArrowLeft className="size-4" />
            Back to Broadcast
          </Link>
        </Button>
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center animate-fade-in">
          <AlertCircle className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Broadcast not found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            This campaign may have been deleted or you do not have access.
          </p>
          <Button className="mt-6" asChild>
            <Link to={`/dashboard/${agentId}/broadcast`}>Open Broadcast list</Link>
          </Button>
        </div>
      </div>
    );
  }

  const totalRecipients = schedule.totalCount;
  const costRm =
    recipientRows?.reduce((sum, row) => sum + row.estCostMyr, 0) ??
    0;
  const sentCount =
    schedule.status === 'completed' ? (schedule.okCount ?? 0) : undefined;
  const activeTabMeta =
    BROADCAST_DETAIL_TABS.find((t) => t.id === activeTab) ?? BROADCAST_DETAIL_TABS[0];
  const scheduledLabel = new Date(schedule.scheduledAt).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handleConfirmAction = async () => {
    setActionBusy(true);
    try {
      if (confirmMode === 'cancel') {
        await cancelSchedule({ scheduleId: typedScheduleId });
        toast.success('Broadcast cancelled.');
      } else {
        await deleteSchedule({ scheduleId: typedScheduleId });
        toast.success('Broadcast record deleted.');
        navigate(`/dashboard/${agentId}/broadcast`);
      }
      setConfirmOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionBusy(false);
    }
  };

  const whatsAppPreview = (
    <WhatsAppTemplatePreview
      templateName={template?.name}
      components={template?.components}
      isLoading={templatesLoading}
      emptyMessage="Template preview unavailable."
      className="max-w-sm"
    />
  );

  return (
    <div className="flex w-full flex-col gap-6 animate-fade-in pb-12">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit gap-1.5 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link to={`/dashboard/${agentId}/broadcast`}>
          <ArrowLeft className="size-4" />
          Back to Broadcast
        </Link>
      </Button>

      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
            {schedule.templateName}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Scheduled for {scheduledLabel}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2 shrink-0">
            {schedule.status === 'pending' && (
              <Button
                variant="outline"
                className="h-10 font-semibold"
                onClick={() => {
                  setConfirmMode('cancel');
                  setConfirmOpen(true);
                }}
              >
                Cancel broadcast
              </Button>
            )}
            <Button
              variant="destructive"
              className="h-10 gap-2 font-semibold"
              onClick={() => {
                setConfirmMode('delete');
                setConfirmOpen(true);
              }}
            >
              <Trash2 className="size-4" />
              Delete record
            </Button>
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[252px_1fr]">
        <DetailSectionNav
          tabs={BROADCAST_DETAIL_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="flex min-w-0 flex-col gap-6">
          <DetailSectionHeading title={activeTabMeta.label} />

          {activeTab === 'overview' ? (
            <BroadcastDetailOverview
              totalRecipients={totalRecipients}
              sentCount={sentCount}
              deliveredPercent={
                schedule.status === 'completed' && totalRecipients > 0
                  ? Math.round(
                      ((schedule.okCount ?? 0) / totalRecipients) * 100,
                    )
                  : undefined
              }
              costRm={costRm}
              channelLabel={channel ? channelLabel(channel) : '—'}
              templateName={schedule.templateName}
              templateLanguage={schedule.templateLanguage}
              scheduledLabel={scheduledLabel}
              deliverySummary={
                schedule.status === 'completed'
                  ? `${schedule.okCount ?? 0} sent · ${schedule.failCount ?? 0} failed`
                  : `${totalRecipients} planned`
              }
              status={schedule.status}
              errorMessage={schedule.errorMessage}
              preview={whatsAppPreview}
            />
          ) : null}

          {activeTab === 'recipients' ? (
            <BroadcastRecipientsTable
              rows={recipientRows ?? []}
              totalCostMyr={costRm}
            />
          ) : null}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmMode === 'cancel' ? 'Cancel broadcast' : 'Delete broadcast record'}
            </DialogTitle>
            <DialogDescription>
              {confirmMode === 'cancel'
                ? 'This scheduled broadcast will not be sent. You can still delete the record later.'
                : 'This removes the campaign from your history. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={actionBusy}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmAction()}
              disabled={actionBusy}
            >
              {actionBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : confirmMode === 'cancel' ? (
                'Confirm cancel'
              ) : (
                'Confirm delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
