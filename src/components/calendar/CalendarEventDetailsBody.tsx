import type { ReactNode } from 'react';
import {
  AlignLeft,
  Calendar,
  Clock,
  Hash,
  Link2,
  NotebookPen,
  Phone,
  User,
  Users,
} from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  formatCollectedFieldValue,
  type BookingDetailItem,
} from '@/components/booking/BookingDetailsPanel';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export type AppointmentDetails = {
  eventId: Id<'calendarEvents'>;
  title: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  bookingSource?: 'manual' | 'ai';
  isAppointmentBooking: boolean;
  serviceName: string;
  serviceFields: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
  }>;
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

function visibleRows(rows: BookingDetailItem[]) {
  return rows.filter((row) => row.value !== '—' && row.value.trim().length > 0);
}

function buildCustomerFieldRows(details: AppointmentDetails): BookingDetailItem[] {
  const rows: BookingDetailItem[] = [];
  const labeledKeys = new Set<string>();

  for (const field of details.serviceFields) {
    labeledKeys.add(field.key);
    const value = formatCollectedFieldValue(details.collectedFields[field.key]);
    if (value === '—') continue;
    if (DEFAULT_FIELD_KEYS.has(field.key.toLowerCase())) continue;
    rows.push({ label: field.label, value, icon: User });
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

function buildDateRows(details: AppointmentDetails): BookingDetailItem[] {
  return visibleRows([
    { label: 'Date', value: details.date, icon: Calendar },
    { label: 'Time', value: details.timeRange, icon: Clock },
    { label: 'Link', value: details.link ?? '', icon: Link2 },
    {
      label: 'Booking reference',
      value: details.eventId,
      icon: Hash,
    },
  ]);
}

function buildCustomerRows(details: AppointmentDetails): BookingDetailItem[] {
  const customerName =
    details.customerName ??
    formatCollectedFieldValue(details.collectedFields.name);
  const customerPhone = formatCollectedFieldValue(details.collectedFields.phone);

  return visibleRows([
    { label: 'Name', value: customerName, icon: User },
    { label: 'Phone', value: customerPhone, icon: Phone },
  ]);
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'TM';
}

function DetailRow({ label, value, icon: Icon }: BookingDetailItem) {
  if (value === '—' || value.trim().length === 0) return null;

  return (
    <div className="flex items-center gap-4">
      {Icon ? <Icon className="size-5 shrink-0 text-muted-foreground" /> : null}
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {value.startsWith('http://') || value.startsWith('https://') ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-base leading-relaxed text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-foreground">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function DetailSection({ title, rows }: { title: string; rows: BookingDetailItem[] }) {
  const rowsToShow = visibleRows(rows);
  if (rowsToShow.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <div className="flex flex-col gap-4">
        {rowsToShow.map((row) => (
          <DetailRow key={`${title}-${row.label}-${row.value}`} {...row} />
        ))}
      </div>
    </section>
  );
}

function NotesBlock({ remarks }: { remarks?: string }) {
  const hasRemarks = Boolean(remarks?.trim());

  return (
    <div className="flex items-center gap-4">
      <NotebookPen className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 py-0.5">
        <h3 className="text-sm font-semibold text-muted-foreground">Internal notes</h3>
        {hasRemarks ? (
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-foreground">
            {remarks}
          </p>
        ) : (
          <p className="text-base leading-relaxed text-muted-foreground">
            No internal notes yet.
          </p>
        )}
      </div>
    </div>
  );
}

function TeamMemberBlock({ name }: { name?: string }) {
  if (!name) return null;

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg">
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-sm font-medium text-muted-foreground">Team member</p>
        <p className="truncate text-base leading-relaxed text-foreground">{name}</p>
      </div>
    </div>
  );
}

export function EventDetailsBody({
  details,
  actions,
}: {
  details: AppointmentDetails;
  actions?: ReactNode;
}) {
  const dateRows = buildDateRows(details);
  const customerRows = buildCustomerRows(details);
  const attendeeRows = details.attendeeNames.length > 0
    ? [{ label: 'Attendees', value: details.attendeeNames.join(', '), icon: Users }]
    : [];
  const customerFieldRows = buildCustomerFieldRows(details);
  const hasSummary = Boolean(details.description?.trim());

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <h2 className="min-w-0 flex-1 break-words text-2xl font-semibold leading-tight text-foreground">
          {details.title}
        </h2>
        {actions}
      </div>

      <div className="grid grid-cols-1 gap-8 border-y border-border py-6 sm:grid-cols-2">
        <DetailSection title="Date" rows={dateRows} />
        <DetailSection title="Customer detail" rows={customerRows} />
      </div>

      <section className="flex flex-col gap-5">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">
          Internal details
        </h3>
        <div className="flex flex-col gap-5">
          <TeamMemberBlock name={details.teamMember} />
          <DetailSection title="Team" rows={attendeeRows} />
          <NotesBlock remarks={details.remarks} />
        </div>
        {hasSummary ? (
          <div className="flex items-center gap-4">
            <AlignLeft className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 py-0.5">
              <h3 className="text-sm font-semibold text-muted-foreground">Summary</h3>
              <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-foreground">
                {details.description}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <DetailSection title="Customer detail" rows={customerFieldRows} />
    </div>
  );
}
