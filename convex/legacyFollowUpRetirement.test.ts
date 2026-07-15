import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, test } from 'vitest';

const convexDirectory = new URL('.', import.meta.url);
const legacyIdentifiers = [
  'followUpRules',
  'followUpSends',
  'followUpPending',
  'followUpAttempt',
  'followUpPendingRuleId',
  'followUpScheduledAt',
  'followUpWorkpool',
  'whatsappFollowUp',
  'followUpQueries',
];

function productionTypeScriptFiles(directoryPath: string): string[] {
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '_generated' ? [] : productionTypeScriptFiles(path);
    }
    if (extname(entry.name) !== '.ts' || entry.name.endsWith('.test.ts')) {
      return [];
    }
    return [path];
  });
}

describe('legacy follow-up backend retirement', () => {
  test('deletes the legacy backend modules', () => {
    expect(existsSync(new URL('./whatsappFollowUp.ts', import.meta.url))).toBe(false);
    expect(existsSync(new URL('./followUpPool.ts', import.meta.url))).toBe(false);
    expect(existsSync(new URL('./followUpQueries.ts', import.meta.url))).toBe(false);
  });

  test('removes every legacy identifier from production Convex source', () => {
    const matches = productionTypeScriptFiles(convexDirectory.pathname).flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return legacyIdentifiers
        .filter((identifier) => source.includes(identifier))
        .map((identifier) => `${path}:${identifier}`);
    });

    expect(matches).toEqual([]);
  });
});
