import { useState } from 'react';
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
  BOOKING_SHINE_COLORS,
  formatCollectedFieldValue,
  type BookingDetailItem,
  type BookingDetailSection,
  type BookingDetailsPanelActions,
} from '@/components/booking/BookingDetailsPanel';
import { cn } from '@/lib/utils';
import { EditBookingDialog } from '../calendar/EditBookingDialog';

export type InboxBookingDetails = {
  bookingId: string;
  status: string;
  service: {
    name: string;
    fields: Array<{ key: string; label: string; type?: string }>;
  };
  collectedFields: Record<string, string | number | boolean | null>;
  date: string;
  timeRange: string;
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
}: {
  booking: InboxBookingDetails;
  variant?: 'panel' | 'compact';
  className?: string;
  canManage?: boolean;
  agentId?: string;
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [autoFocusRemarks, setAutoFocusRemarks] = useState(false);

  const handleEditBooking = () => {
    setAutoFocusRemarks(false);
    setEditDialogOpen(true);
  };

  const handleAddRemarks = () => {
    setAutoFocusRemarks(true);
    setEditDialogOpen(true);
  };

  const actions: BookingDetailsPanelActions | undefined = canManage
    ? {
        onAddRemarks: handleAddRemarks,
        onEditBooking: handleEditBooking,
        disableAddRemarks: !agentId,
        disableEditBooking: !agentId,
      }
    : undefined;

  if (variant === 'compact') {
    const compactActions: BookingDetailsPanelActions | undefined = canManage
      ? {
          onEditBooking: handleEditBooking,
          disableEditBooking: !agentId,
        }
      : undefined;

    return (
      <>
        <BookingDetailsPanel
          title={booking.service.name}
          date={booking.date}
          timeRange={booking.timeRange}
          actions={compactActions}
          shineColors={BOOKING_SHINE_COLORS}
          variant="compact"
          className={cn(className)}
        />
        {editDialogOpen && agentId && (
          <EditBookingDialog
            eventId={booking.bookingId as Id<'calendarEvents'>}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            agentId={agentId}
            autoFocusRemarks={autoFocusRemarks}
          />
        )}
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
  if (booking.date) {
    bookingDetailRows.push({ label: 'Date', value: booking.date, icon: Calendar });
  }
  if (booking.timeRange) {
    bookingDetailRows.push({ label: 'Time', value: booking.timeRange, icon: Clock });
  }
  bookingDetailRows.push({
    label: 'Booking reference',
    value: booking.bookingId,
    icon: Hash,
  });
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
        badge={booking.status === 'editing' ? 'Editing' : undefined}
        sections={sections}
        variant="inline"
        className={cn(className)}
        actions={actions}
      />
      {editDialogOpen && agentId && (
        <EditBookingDialog
          eventId={booking.bookingId as Id<'calendarEvents'>}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          agentId={agentId}
          autoFocusRemarks={autoFocusRemarks}
        />
      )}
    </>
  );
}
