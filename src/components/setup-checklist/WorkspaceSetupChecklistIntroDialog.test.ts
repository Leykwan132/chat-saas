import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('./WorkspaceSetupChecklistIntroDialog.tsx', import.meta.url),
  'utf8',
);

test('welcome title uses the current host brand instead of a hardcoded Kilobot label', () => {
  expect(source).toContain('hostBrandName(useHostBrand())');
  expect(source).toContain('Welcome to {brandName}');
  expect(source).toContain('open && brandName !== \'\'');
  expect(source).not.toContain('Welcome to Kilobot');
});
