import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./buttonVariants.ts', import.meta.url), 'utf8');

test('destructive ghost buttons stay red without a background', () => {
  const variant = source.match(/destructiveGhost:\s*\n?\s*"([^"]+)"/);
  expect(variant).toBeTruthy();
  const classes = variant?.[1].split(/\s+/) ?? [];
  expect(classes).toContain('text-destructive');
  expect(classes).toContain('hover:text-destructive');
  expect(classes).toContain('cursor-pointer');
  expect(classes).toContain('focus-visible:ring-destructive/20');
  expect(classes.some((className) => /^(?:hover:|active:|dark:)*bg-(?!clip-padding)/.test(className))).toBe(false);
});
