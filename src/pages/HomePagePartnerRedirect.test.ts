import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('partner surfaces redirect the home route to sign in', () => {
  const source = readFileSync(new URL('./HomePage.tsx', import.meta.url), 'utf8');

  expect(source).toContain("surface === 'partner'");
  expect(source).toContain('<Navigate to="/sign-in" replace />');
});
