import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('provides a manager context editor with explicit save states', () => {
  const path = new URL('./AvatarContextEditor.tsx', import.meta.url);
  expect(existsSync(path)).toBe(true);
  const source = readFileSync(path, 'utf8');
  expect(source).toContain('System instructions');
  expect(source).toContain('Opening text');
  expect(source).toContain('Save context');
  expect(source).toContain('api.avatarContext.save');
});
