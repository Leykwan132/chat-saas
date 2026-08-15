import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Calendar New Booking action', () => {
  it('places New Booking after selected date header and keeps selected date for dialog', () => {
    const page = readFileSync(new URL('./CalendarPage.tsx', import.meta.url), 'utf8');

    expect(page).toContain('className="flex min-w-0 items-center gap-[15px]"');
    expect(page).toContain('onClick={() => setCreateBookingOpen(true)}');
    expect(page).toContain("initialDate={format(selectedDate, 'yyyy-MM-dd')}");
  });
});
