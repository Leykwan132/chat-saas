import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  const url = new URL(path, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
}

test('uses the availability time combobox in every booking edit form', () => {
  for (const path of ['./CalendarEventDetailsEditBody.tsx', './EditBookingForm.tsx']) {
    const formSource = source(path);
    expect(formSource).toContain("from '@/components/EditableTimeCombobox'");
    expect(formSource.match(/<EditableTimeCombobox/g)?.length).toBe(2);
    expect(formSource).not.toContain('TimeSelectInput');
    expect(formSource).toContain('grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]');
    expect(formSource).toContain('aria-hidden="true">–</span>');
  }
});
