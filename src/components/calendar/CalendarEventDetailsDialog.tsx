import { useQuery } from 'convex/react';
import {
  AlignLeft,
  Calendar,
  Clock,
  Hash,
  Link2,
  MessageSquare,
  Phone,
  User,
  Users,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  BookingDetailsPanel,
  BookingDetailsPanelSkeleton,
  formatCollectedFieldValue,
  type BookingDetailItem,
  type BookingDetailSection,
} from '@/components/booking/BookingDetailsPanel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type AppointmentDetails = {
  eventId: Id<'calendarEvents'>;
  title: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  bookingSource?: 'manual' | 'ai';
  isAutoBooking: boolean;
  serviceName: string;
  serviceFields: Array<{ key: string; label: string }>;
  collectedFields: Record<string, string | number | boolean | null>;
  date: string;
  timeRange: string;
  teamMember?: string;
  customerName?: string;
  attendeeNames: string[];
  description?: string;
  link?: string;
  remarks?: string;
  conversationId?: Id<'conversations'>;
};

const DEFAULT_FIELD_KEYS = new Set(['date', 'time', 'name', 'phone']);

function buildExtraFieldRows(details: AppointmentDetails): BookingDetailItem[] {
  const rows: BookingDetailItem[] = [];
  const labeledKeys = new Set<string>();

  for (const field of details.serviceFields) {
    labeledKeys.add(field.key);
    const value = formatCollectedFieldValue(details.collectedFields[field.key]);
    if (value === '—') continue;
    if (DEFAULT_FIELD_KEYS.has(field.key.toLowerCase())) continue;
    rows.push({
      label: field.label,
      value,
      icon: User,
    });
  }

  for (const [key, value] of Object.entries(details.collectedFields)) {
    if (labeledKeys.has(key)) continue;
    const formatted = formatCollectedFieldValue(value);
    if (formatted === '—') continue;
    if (DEFAULT_FIELD_KEYS.has(key.toLowerCase())) continue;
    rows.push({
      label: key
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
      value: formatted,
      icon: User,
    });
  }

  return rows;
}

function buildDetailSections(details: AppointmentDetails): BookingDetailSection[] {
  const bookingDetailRows: BookingDetailItem[] = [];
  if (details.date) {
    bookingDetailRows.push({ label: 'Date', value: details.date, icon: Calendar });
  }
  if (details.timeRange) {
    bookingDetailRows.push({ label: 'Time', value: details.timeRange, icon: Clock });
  }
  if (details.link) {
    bookingDetailRows.push({ label: 'Link', value: details.link, icon: Link2 });
  }
  if (details.description) {
    bookingDetailRows.push({ label: 'Description', value: details.description, icon: AlignLeft });
  }
  bookingDetailRows.push({
    label: 'Booking reference',
    value: details.eventId,
    icon: Hash,
  });
  bookingDetailRows.push(...buildExtraFieldRows(details));

  const customerDetailRows: BookingDetailItem[] = [];
  const customerName =
    details.customerName ??
    formatCollectedFieldValue(details.collectedFields.name);
  const customerPhone = formatCollectedFieldValue(details.collectedFields.phone);
  if (customerName !== '—') {
    customerDetailRows.push({
      label: 'Customer name',
      value: customerName,
      icon: User,
    });
  }
  if (customerPhone !== '—') {
    customerDetailRows.push({ label: 'Phone', value: customerPhone, icon: Phone });
  }

  const teamDetailRows: BookingDetailItem[] = [];
  if (details.teamMember) {
    teamDetailRows.push({
      label: 'Team member',
      value: details.teamMember,
      icon: User,
    });
  }
  if (details.attendeeNames.length > 0) {
    teamDetailRows.push({
      label: 'Attendees',
      value: details.attendeeNames.join(', '),
      icon: Users,
    });
  }

  const sections: BookingDetailSection[] = [
    { title: 'Booking detail', rows: bookingDetailRows },
    { title: 'Customer detail', rows: customerDetailRows },
    { title: 'Team detail', rows: teamDetailRows },
  ];

  if (details.remarks?.trim()) {
    sections.push({
      title: 'Remarks',
      rows: [{ label: 'Remarks', value: details.remarks, icon: MessageSquare }],
    });
  }

  return sections;
}

type CalendarEventDetailsDialogProps = {
  eventId: Id<'calendarEvents'> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  onEdit: () => void;
};

export function CalendarEventDetailsDialog({
  eventId,
  open,
  onOpenChange,
  canEdit,
  onEdit,
}: CalendarEventDetailsDialogProps) {

  const details = useQuery(
    api.calendarEvents.getAppointmentDetails,
    open && eventId ? { eventId } : 'skip',
  );

  const loading = open && eventId !== null && details === undefined;
  const sections = details ? buildDetailSections(details) : [];
  const title = details
    ? details.isAutoBooking && details.serviceName
      ? details.serviceName
      : details.title
    : 'Appointment details';
  const badge = details?.status === 'cancelled' ? 'Cancelled' : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[min(70vh,560px)] overflow-y-auto px-6 py-5">
            {loading ? (
              <BookingDetailsPanelSkeleton variant="inline" />
            ) : details ? (
              <BookingDetailsPanel
                title={title}
                badge={badge}
                sections={sections}
                variant="inline"
                actions={
                  canEdit && details.isAutoBooking
                    ? {
                        onEditBooking: onEdit,
                      }
                    : undefined
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">Appointment not found.</p>
            )}
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <div className="flex w-full items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
