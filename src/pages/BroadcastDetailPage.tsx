import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Users,
  AlertCircle,
  LayoutList,
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';

function recipientStatusBadgeClass(label: string): {
  badge: string;
  dot: string;
} {
  if (label === 'Delivered') {
    return {
      badge:
        'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    };
  }
  if (label === 'Failed') {
    return {
      badge: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
      dot: 'bg-rose-500',
    };
  }
  if (label === 'Scheduled') {
    return {
      badge: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
      dot: 'bg-amber-500',
    };
  }
  if (label === 'Sending') {
    return {
      badge: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
      dot: 'bg-blue-500',
    };
  }
  if (label === 'Cancelled') {
    return {
      badge: 'bg-neutral-500/10 border-neutral-500/20 text-neutral-500',
      dot: 'bg-neutral-400',
    };
  }
  return {
    badge: 'bg-muted/40 border-border text-muted-foreground',
    dot: 'bg-neutral-500',
  };
}

const BROADCAST_DETAIL_TABS: DetailSectionTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutList,
  },
  {
    id: 'recipients',
    label: 'Recipients',
    icon: Users,
  },
];

type TemplateRow = {
  name: string;
  language: string;
  status: string;
  components?: Array<{ type: string; text?: string }>;
};

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
  const listTemplates = useAction(api.whatsappBroadcast.listTemplates);

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'cancel' | 'delete'>('delete');
  const [actionBusy, setActionBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const channel = useMemo(() => {
    if (!channels || !schedule) return null;
    return channels.find((c) => c._id === schedule.channelId) ?? null;
  }, [channels, schedule]);

  const loadTemplates = useCallback(async () => {
    if (!schedule?.channelId) return;
    setTemplatesLoading(true);
    try {
      const { templates: rows } = await listTemplates({ channelId: schedule.channelId });
      setTemplates(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setTemplatesLoading(false);
    }
  }, [schedule?.channelId, listTemplates]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const template = useMemo(() => {
    if (!schedule) return null;
    return (
      templates.find(
        (t) =>
          t.name === schedule.templateName && t.language === schedule.templateLanguage,
      ) ?? null
    );
  }, [templates, schedule]);

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

      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">
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

          {activeTab === 'overview' && (
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)]">
              <div className="flex min-w-0 flex-col">
                {/* Stat cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Sent
                    </span>
                    <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                      {sentCount !== undefined ? sentCount.toLocaleString() : totalRecipients.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Delivered
                    </span>
                    <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                      {schedule.status === 'completed' && totalRecipients > 0
                        ? `${Math.round(((schedule.okCount ?? 0) / totalRecipients) * 100)}%`
                        : '—'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Est. cost
                    </span>
                    <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                      RM {costRm.toFixed(2)}
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                <div className="flex w-full flex-col gap-8">
                  {/* WhatsApp account */}
                  <div className="flex max-w-xl flex-col gap-2.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <SiWhatsapp className="size-3.5 shrink-0 text-[#25D366]" aria-hidden />
                      WhatsApp account
                    </Label>
                    <p className="m-0 text-sm font-semibold text-foreground">
                      {channel ? channelLabel(channel) : '—'}
                    </p>
                  </div>

                  {/* Template & Schedule / Recipients & Status */}
                  <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
                    <div className="w-full space-y-4 lg:col-span-5">
                      <h3 className="text-base font-bold text-foreground">Message</h3>
                      <div className="flex flex-col gap-2.5">
                        <Label className="text-xs font-semibold text-foreground">Template</Label>
                        <p className="m-0 text-sm font-semibold text-foreground font-mono">
                          {schedule.templateName}
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            ({schedule.templateLanguage})
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="w-full space-y-4 border-t border-border pt-6 lg:col-span-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
                      <h3 className="text-base font-bold text-foreground">Delivery</h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2.5">
                          <Label className="text-xs font-semibold text-foreground">Scheduled time</Label>
                          <p className="m-0 text-sm font-semibold text-foreground">{scheduledLabel}</p>
                        </div>
                        <div className="flex flex-col gap-2.5">
                          <Label className="text-xs font-semibold text-foreground">Recipients</Label>
                          <p className="m-0 text-sm font-semibold text-foreground">
                            {schedule.status === 'completed'
                              ? `${schedule.okCount ?? 0} sent · ${schedule.failCount ?? 0} failed`
                              : `${totalRecipients} planned`}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2.5">
                          <Label className="text-xs font-semibold text-foreground">Status</Label>
                          <p className="m-0 text-sm font-semibold text-foreground capitalize">
                            {schedule.status}
                          </p>
                        </div>
                        {schedule.errorMessage && (
                          <div className="flex flex-col gap-2.5 sm:col-span-2">
                            <Label className="text-xs font-semibold text-rose-600 dark:text-rose-400">Error</Label>
                            <p className="m-0 text-sm font-semibold text-rose-600 dark:text-rose-400">
                              {schedule.errorMessage}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full lg:justify-self-end lg:border-l lg:border-border lg:pl-8">
                {whatsAppPreview}
              </div>
            </div>
          )}

          {activeTab === 'recipients' && (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground">
                        Recipient
                      </th>
                      <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground">
                        Date & time
                      </th>
                      <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground">
                        Status
                      </th>
                      <th className="px-5 py-3.5 text-right font-semibold text-muted-foreground">
                        Est. cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recipientRows === null || recipientRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-8 text-center text-muted-foreground"
                        >
                          No recipients for this broadcast.
                        </td>
                      </tr>
                    ) : (
                      recipientRows.map((row) => {
                        const dateLabel = new Date(row.sentAt).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        });
                        const statusStyle = recipientStatusBadgeClass(row.deliveryLabel);

                        return (
                          <tr key={row.phone} className="hover:bg-muted/20">
                            <td className="px-5 py-3.5 align-middle">
                              <div className="font-medium text-foreground">
                                {row.name ?? row.phone}
                              </div>
                              {row.name ? (
                                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  {row.phone}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-5 py-3.5 align-middle text-foreground tabular-nums">
                              {dateLabel}
                            </td>
                            <td className="px-5 py-3.5 align-middle">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                                  statusStyle.badge,
                                )}
                              >
                                <span
                                  className={cn('size-1.5 rounded-full', statusStyle.dot)}
                                />
                                {row.deliveryLabel}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 align-middle text-right font-medium tabular-nums text-foreground">
                              RM {row.estCostMyr.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {recipientRows && recipientRows.length > 0 ? (
                    <tfoot>
                      <tr className="border-t border-border bg-muted/20">
                        <td
                          colSpan={3}
                          className="px-5 py-3 text-right text-sm font-semibold text-muted-foreground"
                        >
                          Total ({recipientRows.length} recipients)
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                          RM {costRm.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </div>
          )}

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
