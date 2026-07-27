import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('upgrade modal context stays in a stable module separate from provider UI', () => {
  const contextSource = readFileSync(
    new URL('./upgradeModalContext.ts', import.meta.url),
    'utf8',
  );
  const providerSource = readFileSync(
    new URL('./UpgradeModal.tsx', import.meta.url),
    'utf8',
  );
  const rootLayoutSource = readFileSync(
    new URL('../router/AppRouteComponents.tsx', import.meta.url),
    'utf8',
  );

  expect(contextSource).toContain('createContext');
  expect(contextSource).toContain('export function useUpgradeModal');
  expect(providerSource).toContain("from '@/components/upgradeModalContext'");
  expect(providerSource).not.toContain('createContext');
  expect(rootLayoutSource).toContain('<UpgradeModalProvider>');
});
