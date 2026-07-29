import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const source = readFileSync(
  new URL('./CreateTeamDialog.tsx', import.meta.url),
  'utf8',
);

describe('CreateTeamDialog', () => {
  test('checks the plan gate before opening the team form', () => {
    const openChange = source.slice(
      source.indexOf('const handleOpenChange'),
      source.indexOf('const handleSubmit'),
    );

    expect(source).toContain(
      "import { resolveTeamCreationGate } from '@/lib/teamCreationGate';",
    );
    expect(openChange).toContain(
      'const decision = resolveTeamCreationGate(canCreateOrgTeam);',
    );
    expect(openChange).toContain("if (decision === 'upgrade')");
    expect(openChange).toContain('openUpgradeModal();');
    expect(openChange).not.toContain('openAdjustPlan();');
    expect(openChange.indexOf('openUpgradeModal();')).toBeLessThan(
      openChange.indexOf('setOpen(next);'),
    );
  });
});
