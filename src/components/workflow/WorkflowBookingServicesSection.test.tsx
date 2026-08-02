import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const source = readFileSync(
  fileURLToPath(new URL('./WorkflowBookingServicesSection.tsx', import.meta.url)),
  'utf8',
);

test('shows the booking status beside a top-aligned service switch', () => {
  expect(source).toContain("checked ? 'Active' : 'Inactive'");
  expect(source).toContain('flex shrink-0 items-start gap-1.5');
});
