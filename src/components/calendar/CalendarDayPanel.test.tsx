import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CalendarDayEmptyState } from './CalendarDayEmptyState';
import { CalendarDayHeader } from './CalendarDayHeader';

describe('Calendar day booking actions', () => {
  it('renders the selected day left of a dark booking action', () => {
    const markup = renderToStaticMarkup(
      <CalendarDayHeader
        canManageCalendar
        isToday
        selectedDate={new Date(2026, 7, 15)}
        onCreateBooking={() => undefined}
      />,
    );

    expect(markup).toContain('justify-between');
    expect(markup).toContain('Today');
    expect(markup).toContain('>15<');
    expect(markup).toContain('New Booking');
    expect(markup).toContain('bg-primary');
  });

  it('hides booking actions without calendar permission', () => {
    const header = renderToStaticMarkup(
      <CalendarDayHeader
        canManageCalendar={false}
        isToday={false}
        selectedDate={new Date(2026, 7, 16)}
        onCreateBooking={() => undefined}
      />,
    );
    const emptyState = renderToStaticMarkup(
      <CalendarDayEmptyState canManageCalendar={false} onCreateBooking={() => undefined} />,
    );

    expect(header).not.toContain('New Booking');
    expect(emptyState).not.toContain('New Booking');
  });

  it('renders a dark booking action in the no-events empty state', () => {
    const markup = renderToStaticMarkup(
      <CalendarDayEmptyState canManageCalendar onCreateBooking={() => undefined} />,
    );

    expect(markup).toContain('Nothing scheduled for this day yet.');
    expect(markup).toContain('New Booking');
    expect(markup).toContain('bg-primary');
  });
});
