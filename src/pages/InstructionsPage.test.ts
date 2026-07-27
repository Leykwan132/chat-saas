import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('agent setup opens the test window from the launch-guide query param', () => {
  const source = readFileSync(new URL('./InstructionsPage.tsx', import.meta.url), 'utf8');

  expect(source).toContain('AGENT_SETUP_OPEN_TEST_PARAM');
  expect(source).toContain('AGENT_SETUP_OPEN_TEST_VALUE');
  expect(source).toContain('setIsTestOpen(true)');
  expect(source).toContain("setSearchParams(next, { replace: true })");
});
