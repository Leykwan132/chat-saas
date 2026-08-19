import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const adminSource = readFileSync(
  new URL('./admin.ts', import.meta.url),
  'utf8',
);
const portalActionsSource = readFileSync(
  new URL('./portalActions.ts', import.meta.url),
  'utf8',
);
const schemaSource = readFileSync(
  new URL('../schema.ts', import.meta.url),
  'utf8',
);

describe('local white-label checkout', () => {
  test('contains resolved partner portal modules', () => {
    expect(adminSource).not.toContain('<<<<<<<');
    expect(portalActionsSource).not.toContain('<<<<<<<');
  });

  test('declares the membership role index once', () => {
    expect(schemaSource.match(/\.index\("by_userId_and_role"/g)).toHaveLength(1);
  });
});
