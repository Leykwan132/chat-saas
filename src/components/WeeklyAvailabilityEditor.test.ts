import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SCHEDULE_TIME_OPTIONS } from '@/lib/scheduleUtils';
import { WeeklyAvailabilityEditor } from './WeeklyAvailabilityEditor';

const editorSource = readFileSync(new URL('./WeeklyAvailabilityEditor.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../pages/ScheduleUserAvailabilityPage.tsx', import.meta.url), 'utf8');

describe('Available 24/7 editor', () => {
  it('shows unavailable labels for weekdays without time slots', () => {
    const markup = renderToStaticMarkup(
      createElement(WeeklyAvailabilityEditor, {
        shiftDrafts: [
          {
            key: 'thursday-9-to-5',
            dayOfWeek: 4,
            startMinutes: 540,
            endMinutes: 1020,
          },
        ],
        onShiftDraftsChange: () => undefined,
        timezone: 'Asia/Kuala_Lumpur',
        onTimezoneChange: () => undefined,
        timeOptions: SCHEDULE_TIME_OPTIONS,
      }),
    );

    expect(markup.match(/>Unavailable<\/span>/g)).toHaveLength(6);
  });

  it('renders the global control below all weekday rows', () => {
    expect(editorSource).toContain('Available 24/7');
    expect(editorSource).toContain('Set availability to 24 hours for all seven days.');
    expect(editorSource.indexOf('SCHEDULE_DAYS.map')).toBeLessThan(
      editorSource.indexOf('Available 24/7'),
    );
    expect(editorSource).toContain('createAllDayShiftDrafts()');
    expect(editorSource).toContain('createStandardShiftDrafts()');
  });

  it('prevents contradictory day edits while the week is all-day', () => {
    expect(editorSource).toContain('disabled={available24x7}');
    expect(editorSource).toContain('available24x7 ? (');
    expect(editorSource).toContain('24 hours');
    expect(editorSource).not.toContain('Date.now()');
  });

  it('keeps timezone controls without the old card wrapper', () => {
    expect(editorSource).toContain('<Label htmlFor="schedule-timezone"');
    expect(editorSource).toContain('<TimeZoneSelect');
    expect(editorSource).not.toContain('self-start rounded-xl border border-border bg-card p-6');
    expect(pageSource).not.toContain('self-start rounded-xl border border-border bg-card p-6');
  });
});
