import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const hookSource = readFileSync(
  new URL('../../hooks/usePartnerManagedWorkspace.ts', import.meta.url),
  'utf8',
);
const sidebarSource = readFileSync(
  new URL('./AgentsSidebar.tsx', import.meta.url),
  'utf8',
);
const switcherSource = readFileSync(
  new URL('../TeamSwitcher.tsx', import.meta.url),
  'utf8',
);
const accountMenuSource = readFileSync(
  new URL('../TeamsAccountSubmenu.tsx', import.meta.url),
  'utf8',
);
const teamsTableSource = readFileSync(
  new URL('../teams/TeamsTableSection.tsx', import.meta.url),
  'utf8',
);
const teamDetailSource = readFileSync(
  new URL('../teams/TeamDetailSection.tsx', import.meta.url),
  'utf8',
);

describe('partner-managed workspace controls', () => {
  test('reads the managed-workspace state from Convex', () => {
    expect(hookSource).toContain('isPartnerManagedCurrentWorkspace');
  });

  test('hides workspace and account-management controls for customers', () => {
    for (const source of [
      sidebarSource,
      switcherSource,
      accountMenuSource,
      teamsTableSource,
      teamDetailSource,
    ]) {
      expect(source).toContain('usePartnerManagedWorkspace');
    }
  });

  test('hides referral credits for partner-managed workspaces', () => {
    expect(sidebarSource).toContain(
      'referralProgramEnabled && isPartnerManagedWorkspace === false',
    );
  });
});
