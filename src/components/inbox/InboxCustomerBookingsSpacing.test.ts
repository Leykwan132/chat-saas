import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('./InboxCustomerBookingsSection.tsx', import.meta.url),
  'utf8',
);

test('create booking has comfortable outer and inner spacing', () => {
  expect(source).toContain('flex flex-col gap-3 px-4 pb-4 pt-2');
  expect(source).toContain('className="h-10 w-full gap-2 px-4"');
});
