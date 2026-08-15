import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CalendarSidebar } from './CalendarSidebar';

function renderCalendarSidebar() {
  return renderToStaticMarkup(
    <CalendarSidebar
      assignedToMeOnly={false}
      eventFilterCounts={{ all: 2, assigned: 1 }}
      hasCurrentUser
      selectedDate={new Date(2026, 7, 2)}
      visibleMonth={new Date(2026, 7, 1)}
      onAssignedToMe={() => undefined}
      onChangeMonth={() => undefined}
      onShowAllEvents={() => undefined}
    />,
  );
}

describe('CalendarSidebar', () => {
  it('renders the month calendar before View', () => {
    const markup = renderCalendarSidebar();

    expect(markup.indexOf('data-calendar-sidebar-section="month"')).toBeLessThan(
      markup.indexOf('>View<'),
    );
  });

  it('renders the active View filter as a fully rounded pill', () => {
    expect(renderCalendarSidebar()).toMatch(
      /<button(?=[^>]*rounded-full)[^>]*>.*All events.*<\/button>/,
    );
  });
});
