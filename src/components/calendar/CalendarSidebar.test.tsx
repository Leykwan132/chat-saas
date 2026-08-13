import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CalendarSidebar } from './CalendarSidebar';

function renderCalendarSidebar(canManageCalendar = true) {
  return renderToStaticMarkup(
    <CalendarSidebar
      assignedToMeOnly={false}
      canManageCalendar={canManageCalendar}
      eventFilterCounts={{ all: 2, assigned: 1 }}
      hasCurrentUser
      selectedDate={new Date(2026, 7, 2)}
      visibleMonth={new Date(2026, 7, 1)}
      onAssignedToMe={() => undefined}
      onChangeMonth={() => undefined}
      onCreateBooking={() => undefined}
      onShowAllEvents={() => undefined}
    />,
  );
}

describe('CalendarSidebar', () => {
  it('renders the month calendar before New Booking and View', () => {
    const markup = renderCalendarSidebar();

    expect(markup.indexOf('data-calendar-sidebar-section="month"')).toBeLessThan(
      markup.indexOf('New Booking'),
    );
    expect(markup.indexOf('New Booking')).toBeLessThan(markup.indexOf('>View<'));
  });

  it('keeps New Booking hidden without Calendar management permission', () => {
    expect(renderCalendarSidebar(false)).not.toContain('New Booking');
  });
});
