import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const sourceUrl = new URL('./ManualBookingScheduleField.tsx', import.meta.url);
const source = existsSync(sourceUrl) ? readFileSync(sourceUrl, 'utf8') : '';

test('composes one clock-led date start and end schedule row', () => {
  expect(source).toContain("import { Check, Clock, X } from 'lucide-react'");
  expect(source).toContain('<Label>Schedule</Label>');
  expect(source).toContain('grid-cols-[auto_minmax(0,1.45fr)_minmax(8rem,0.9fr)_auto_minmax(8rem,0.9fr)]');
  expect(source).toContain('items-center gap-3');
  expect(source).toContain('showLabel={false}');
  expect(source).toContain('ariaLabel="Start time"');
  expect(source).toContain('ariaLabel="End time"');
  expect(source).toContain('aria-hidden="true">–</span>');
  expect(source).toContain('Slot is available.');
});
