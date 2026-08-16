import { existsSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { ManualBookingAvailabilityFeedback } from './ManualBookingScheduleField';

const sourceUrl = new URL('./ManualBookingScheduleField.tsx', import.meta.url);
const source = existsSync(sourceUrl) ? readFileSync(sourceUrl, 'utf8') : '';

test('composes one clock-led date start and end schedule row', () => {
  expect(source).toContain("import { Check, Clock, X } from 'lucide-react'");
  expect(source).toContain('<Label>Date & time</Label>');
  expect(source).not.toContain('<Label>Schedule</Label>');
  expect(source).toContain('grid-cols-[auto_minmax(0,1.45fr)_minmax(8rem,0.9fr)_auto_minmax(8rem,0.9fr)]');
  expect(source).toContain('items-center gap-3');
  expect(source).toContain('showLabel={false}');
  expect(source).toContain('displayFormat="EEEE, d MMMM"');
  expect(source).toContain('ariaLabel="Start time"');
  expect(source).toContain('contentAlign="start"');
  expect(source).toContain('ariaLabel="End time"');
  expect(source).toContain('contentAlign="end"');
  expect(source).toContain('aria-hidden="true">–</span>');
  expect(source).toContain('Slot is available.');
});

test('offers availability settings when the selected slot conflicts', () => {
  const markup = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(ManualBookingAvailabilityFeedback, {
        feedback: { kind: 'conflict', message: 'That slot is no longer available.' },
        availabilityHref: '/dashboard/agent-1/availability',
      }),
    ),
  );

  expect(markup).toContain('That slot is no longer available.');
  expect(markup).toContain('Change availability');
  expect(markup).toContain('href="/dashboard/agent-1/availability"');
});
