import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('provides a manager context editor with explicit save states', () => {
  const path = new URL('./AvatarContextEditor.tsx', import.meta.url);
  expect(existsSync(path)).toBe(true);
  const source = readFileSync(path, 'utf8');
  expect(source).toContain('>Instructions</Label>');
  expect(source).toContain('htmlFor="avatar-context-prompt" className="text-base"');
  expect(source).not.toContain('System instructions');
  expect(source).not.toContain('Instructions Gemini uses for every Avatar conversation.');
  expect(source).not.toContain('>Context</h2>');
  expect(source).toContain('htmlFor="avatar-context-opening" className="text-base">Opening text</Label>');
  expect(source).toContain('grid gap-4');
  expect(source).toContain('voiceSlot?: ReactNode');
  expect(source).toContain('mediaSlot?: ReactNode');
  expect(source).toContain('const openingField =');
  expect(source).toContain('<div className="grid gap-4 sm:grid-cols-2">{openingField}{voiceSlot}</div>');
  expect(source).toContain('lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]');
  expect(source).toContain('<Separator orientation="vertical" className="hidden lg:block" />');
  expect(source).toContain('<Separator className="lg:hidden" />');
  expect(source).toContain('sm:grid-cols-2');
  expect(source.indexOf('avatar-context-opening')).toBeLessThan(source.indexOf('avatar-context-prompt'));
  expect(source.indexOf('avatar-context-prompt')).toBeGreaterThan(source.indexOf('mediaSlot'));
  expect(source).toContain('Save context');
  expect(source).toContain('api.avatarContext.save');
  expect(source).not.toContain('rounded-xl border p-5');
  expect(source).not.toContain('useEffect');
});
