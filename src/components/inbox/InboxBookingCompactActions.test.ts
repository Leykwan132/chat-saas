import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('./InboxBookingDetailsCard.tsx', import.meta.url),
  'utf8',
);
const compactBranch = source.slice(
  source.indexOf("if (variant === 'compact')"),
  source.indexOf('const extraFieldRows'),
);
const expandedActions = source.slice(
  source.indexOf('const actions:'),
  source.indexOf("if (variant === 'compact')"),
);
const bookingPanelSource = readFileSync(
  new URL('../booking/BookingDetailsPanel.tsx', import.meta.url),
  'utf8',
);
const compactPanelBranch = bookingPanelSource.slice(
  bookingPanelSource.indexOf("if (variant === 'compact')"),
  bookingPanelSource.indexOf('const header ='),
);
const bookingActionsSource = readFileSync(
  new URL('../booking/BookingDetailsActionsBar.tsx', import.meta.url),
  'utf8',
);

test('compact booking card exposes mark completed and edit actions', () => {
  expect(compactBranch).toContain('onMarkCompleted');
  expect(compactBranch).toContain('onEditBooking: handleEditBooking');
  expect(compactBranch).toContain("editBookingLabel: 'Edit'");
  expect(compactBranch).toContain('CompletionDialog');
  expect(compactBranch).toContain('openCompletionConfirm');
  expect(compactBranch).toContain('EditBookingDialog');
  expect(compactBranch).not.toContain('onViewDetails');
  expect(expandedActions).toContain('onMarkCompleted');
  expect(expandedActions).toContain('onEditBooking');
  expect(source).toContain('Mark booking as completed?');
  expect(source).toContain('onConfirm={handleMarkCompleted}');
  expect(source).not.toContain('onMarkCompleted: handleMarkCompleted');
});

test('compact booking card shows schedule and compact action buttons', () => {
  expect(compactPanelBranch).toContain('BOOKING_CARD_SURFACE_CLASS');
  expect(compactPanelBranch).toContain('BookingAccentBar');
  expect(compactPanelBranch).toContain('BookingDetailsActionsBar');
  expect(compactPanelBranch).toContain('actions={actions} compact');
  expect(compactPanelBranch).not.toContain('ShineBorder');
  expect(compactPanelBranch).not.toContain('BookedCheckIcon');
  expect(bookingActionsSource).toContain("editBookingLabel ?? 'Edit booking'");
  expect(bookingActionsSource).toContain('Mark as completed');
  expect(bookingActionsSource).not.toContain('View detail');
});
