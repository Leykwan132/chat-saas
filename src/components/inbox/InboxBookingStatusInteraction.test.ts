import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const cardSource = readFileSync(
  new URL('./InboxBookingDetailsCard.tsx', import.meta.url),
  'utf8',
);
const chatsSource = readFileSync(new URL('../../pages/ChatsPage.tsx', import.meta.url), 'utf8');
const rowSource = readFileSync(new URL('./InboxCustomerBookingRow.tsx', import.meta.url), 'utf8');
const tagSource = readFileSync(
  new URL('../booking/BookingStatusTag.tsx', import.meta.url),
  'utf8',
);
const detailsDialogSource = readFileSync(
  new URL('./InboxCustomerBookingDetailsDialog.tsx', import.meta.url),
  'utf8',
);
const panelSource = readFileSync(
  new URL('../booking/BookingDetailsPanel.tsx', import.meta.url),
  'utf8',
);

describe('inbox booking status interaction', () => {
  test('latest booking status opens the full editor for managers', () => {
    expect(cardSource).toContain('BookingStatusTag');
    expect(cardSource).toContain('onClick={canManage ? handleEditBooking : undefined}');
    expect(cardSource).not.toContain('Most recent');
    expect(tagSource).not.toContain('contextLabel');
    expect(chatsSource).toContain('can(Permission.CALENDAR_MANAGE)');
    expect(chatsSource).not.toContain("mostRecentBooking.status === 'booked'");
  });

  test('history and compact cards share status presentation', () => {
    expect(rowSource).toContain('BookingStatusTag');
    expect(rowSource).not.toContain('STATUS_TAG_CLASSES');
    expect(tagSource).toContain('appointmentBookingStatusClass');
    expect(tagSource).toContain('appointmentBookingStatusAccentColor');
    expect(tagSource).toContain('size-1.5 shrink-0 rounded-full');
    expect(tagSource).toContain('<StatusIndicator color={accentColor} />');
    expect(tagSource).toContain('variant="outline"');
    expect(tagSource).not.toContain('border-0');
    expect(tagSource).not.toContain('className={className} style={{ backgroundColor: accentColor }}');
    expect(cardSource).toContain('accentColor={appointmentBookingStatusAccentColor(booking.status)}');
    expect(panelSource).toContain('accentColor?: string;');
    expect(panelSource).toContain('<BookingAccentBar color={accentColor} />');
  });

  test('editing is permission-only while completion is scheduled-only', () => {
    expect(detailsDialogSource).toContain('canManage={canManage}');
    expect(detailsDialogSource).not.toContain("booking.status === 'booked'");
    expect(cardSource).toContain("const canComplete = canManage && booking.status === 'booked'");
    expect(cardSource).toContain('onMarkCompleted: canComplete ? openCompletionConfirm : undefined');
    expect(cardSource).toContain('onMarkCompleted={canComplete ? openCompletionConfirm : undefined}');
  });

  test('status type and errors do not use unchecked or fallback paths', () => {
    expect(cardSource).toContain('status: AppointmentBookingDisplayStatus;');
    expect(cardSource).not.toContain('as AppointmentBookingDisplayStatus');
    expect(cardSource).not.toContain('ponytail');
    expect(cardSource).toContain('if (!(error instanceof Error)) throw error;');
    expect(cardSource).toContain('toast.error(error.message)');
    expect(cardSource).not.toContain("'Could not complete booking'");
  });

  test('compact schedule surface opens details without nesting controls', () => {
    expect(cardSource).toContain('onOpenDetails={onOpenDetails}');
    expect(panelSource).toContain('onOpenDetails?: () => void;');
    expect(panelSource).toContain('onClick={onOpenDetails}');
    expect(panelSource).toContain('{schedule}');
    expect(panelSource).toContain('{title}');
    const scheduleRow = panelSource.slice(
      panelSource.indexOf('flex min-w-0 items-center gap-2'),
      panelSource.indexOf('{compactStatus}') + '{compactStatus}'.length,
    );
    expect(scheduleRow).toContain('{schedule}');
    expect(scheduleRow).toContain('{compactStatus}');
    expect(scheduleRow).not.toContain('BookingDetailsActionsBar');
    expect(scheduleRow).not.toContain('>{title}<');
  });
});
