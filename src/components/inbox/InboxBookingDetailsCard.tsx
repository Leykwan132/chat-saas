import { useState } from 'react';
import { useMutation } from 'convex/react';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  Calendar,
  Clock,
  Hash,
  MessageSquare,
  Phone,
  User,
  type LucideIcon,
} from 'lucide-react';
import {
  BookingDetailsPanel,
  type BookingDetailItem,
  type BookingDetailSection,
  type BookingDetailsPanelActions,
} from '@/components/booking/BookingDetailsPanel';
import { formatCollectedFieldValue } from '@/components/booking/bookingDetailFormatting';
import { formatCompactBookingSchedule } from '@/components/booking/formatCompactBookingSchedule';
import { BookingStatusTag } from '@/components/booking/BookingStatusTag';
import {
  appointmentBookingStatusAccentColor,
  type AppointmentBookingDisplayStatus,
} from '@/lib/appointmentBookingStatusPresentation';
import { cn } from '@/lib/utils';
import { EditBookingDialog } from '../calendar/EditBookingDialog';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type InboxBookingDetails = {
  bookingId: string;
  bookingReference?: string;
  status: AppointmentBookingDisplayStatus;
  service: {
    name: string;
    fields: Array<{ key: string; label: string; type?: string }>;
  };
  collectedFields: Record<string, string | number | boolean | null>;
  date: string;
  timeRange: string;
  startAt: number;
  endAt: number;
  timeZone: string;
  teamMember?: string;
  remarks?: string;
};

const DEFAULT_FIELD_KEYS = new Set(['date', 'time', 'name', 'phone']);

function iconForCollectedField(field: {
  key: string;
  type?: string;
}): LucideIcon {
  const key = field.key.toLowerCase();
  if (field.type === 'phone' || key.includes('phone')) return Phone;
  if (key.includes('name')) return User;
  return User;
}

export function InboxBookingDetailsCard({
  booking,
  variant = 'panel',
  className,
  canManage = false,
  agentId,
  onOpenDetails,
}: {
  booking: InboxBookingDetails;
  variant?: 'panel' | 'compact';
  className?: string;
  canManage?: boolean;
  agentId?: string;
  onOpenDetails?: () => void;
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completionBusy, setCompletionBusy] = useState(false);
  const markBookingCompleted = useMutation(
    api.appointmentBooking.completion.markBookingCompleted,
  );
  const canComplete = canManage && booking.status === 'booked';

  const handleEditBooking = () => {
    setEditDialogOpen(true);
  };

  const openCompletionConfirm = () => {
    if (!editDialogOpen) {
      setCompleteDialogOpen(true);
      return;
    }
    setEditDialogOpen(false);
    window.setTimeout(() => setCompleteDialogOpen(true), 0);
  };

  const handleMarkCompleted = async () => {
    setCompletionBusy(true);
    try {
      await markBookingCompleted({
        bookingId: booking.bookingId as Id<'calendarEvents'>,
      });
      toast.success('Booking marked as completed');
      setCompleteDialogOpen(false);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      toast.error(error.message);
    } finally {
      setCompletionBusy(false);
    }
  };

  const actions: BookingDetailsPanelActions | undefined = canManage
    ? {
        onMarkCompleted: canComplete ? openCompletionConfirm : undefined,
        onEditBooking: handleEditBooking,
        disableMarkCompleted: !agentId || completionBusy,
        disableEditBooking: !agentId,
      }
    : undefined;

  if (variant === 'compact') {
    const compactActions: BookingDetailsPanelActions | undefined = canManage
      ? {
          onMarkCompleted: canComplete ? openCompletionConfirm : undefined,
          onEditBooking: handleEditBooking,
          editBookingLabel: 'Edit',
          disableMarkCompleted: !agentId || completionBusy,
          disableEditBooking: !agentId,
        }
      : undefined;

    return (
      <>
        <BookingDetailsPanel
          title={booking.service.name}
          date={formatCompactBookingSchedule(
            booking.startAt,
            booking.endAt,
            booking.timeZone,
          )}
          compactStatus={
            <BookingStatusTag
              status={booking.status}
              onClick={canManage ? handleEditBooking : undefined}
            />
          }
          accentColor={appointmentBookingStatusAccentColor(booking.status)}
          actions={compactActions}
          onOpenDetails={onOpenDetails}
          variant="compact"
          className={cn(className)}
        />
        {editDialogOpen && agentId ? (
          <EditBookingDialog
            eventId={booking.bookingId as Id<'calendarEvents'>}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            agentId={agentId}
            onMarkCompleted={canComplete ? openCompletionConfirm : undefined}
          />
        ) : null}
        <CompletionDialog
          open={completeDialogOpen}
          busy={completionBusy}
          onOpenChange={setCompleteDialogOpen}
          onConfirm={handleMarkCompleted}
        />
      </>
    );
  }

  const extraFieldRows: BookingDetailItem[] = booking.service.fields
    .filter((field) => !DEFAULT_FIELD_KEYS.has(field.key.toLowerCase()))
    .map((field) => ({
      label: field.label,
      value: formatCollectedFieldValue(booking.collectedFields[field.key]),
      icon: iconForCollectedField(field),
    }))
    .filter((row) => row.value !== '—');

  const bookingDetailRows: BookingDetailItem[] = [];
  if (booking.bookingReference) {
    bookingDetailRows.push({ label: 'Booking reference', value: booking.bookingReference, icon: Hash });
  }
  if (booking.date) {
    bookingDetailRows.push({ label: 'Date', value: booking.date, icon: Calendar });
  }
  if (booking.timeRange) {
    bookingDetailRows.push({ label: 'Time', value: booking.timeRange, icon: Clock });
  }

  bookingDetailRows.push(...extraFieldRows);

  const customerDetailRows: BookingDetailItem[] = [];
  const customerName = formatCollectedFieldValue(booking.collectedFields.name);
  const customerPhone = formatCollectedFieldValue(booking.collectedFields.phone);
  if (customerName !== '—') {
    customerDetailRows.push({ label: 'Customer name', value: customerName, icon: User });
  }
  if (customerPhone !== '—') {
    customerDetailRows.push({ label: 'Phone', value: customerPhone, icon: Phone });
  }

  const teamDetailRows: BookingDetailItem[] = [];
  if (booking.teamMember) {
    teamDetailRows.push({ label: 'Team member', value: booking.teamMember, icon: User });
  }

  const sections: BookingDetailSection[] = [
    { title: 'Booking detail', rows: bookingDetailRows },
    { title: 'Customer detail', rows: customerDetailRows },
    { title: 'Team detail', rows: teamDetailRows },
  ];

  if (booking.remarks?.trim()) {
    sections.push({
      title: 'Remarks',
      rows: [{ label: 'Remarks', value: booking.remarks, icon: MessageSquare }],
    });
  }

  return (
    <>
      <BookingDetailsPanel
        title={booking.service.name}
        sections={sections}
        className={cn(className)}
        actions={actions}
      />
      {editDialogOpen && agentId && (
        <EditBookingDialog
          eventId={booking.bookingId as Id<'calendarEvents'>}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          agentId={agentId}
          onMarkCompleted={canComplete ? openCompletionConfirm : undefined}
        />
      )}
      <CompletionDialog
        open={completeDialogOpen}
        busy={completionBusy}
        onOpenChange={setCompleteDialogOpen}
        onConfirm={handleMarkCompleted}
      />
    </>
  );
}

function CompletionDialog({
  open,
  busy,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[60] sm:max-w-md"
        overlayClassName="z-[60]"
      >
        <DialogHeader>
          <DialogTitle>Mark booking as completed?</DialogTitle>
          <DialogDescription>
            This booking will be removed from the active booking card and kept in calendar history.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void onConfirm()}>
            Mark as completed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
