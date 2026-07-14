import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('./InboxCustomerBookingsSection.tsx', import.meta.url),
  'utf8',
);

test('booking list retains comfortable spacing without the create action', () => {
  expect(source).toContain('flex flex-col gap-3 px-4 pb-4 pt-2');
  expect(source).not.toContain('Create booking');
  expect(source).not.toContain('onCreate');
});
