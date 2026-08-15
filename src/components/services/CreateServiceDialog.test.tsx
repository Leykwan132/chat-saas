import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { CreateServiceDialog } from './CreateServiceDialog';

test('creates a personal service from the first step and retains a team-only second step', () => {
  expect(CreateServiceDialog).toBeTypeOf('function');
  const source = readFileSync(new URL('./CreateServiceDialog.tsx', import.meta.url), 'utf8');

  expect(source).toContain('getCreateServiceAssignmentDefaults');
  expect(source).toContain('getCreateServicePrimaryAction(mode)');
  expect(source).toContain('CreateServiceTeamStep');
  expect(source).toContain('buildServiceMutationArgs');
  expect(source).toContain('validateServiceAssignment');
  expect(source).toContain('navigate(`/dashboard/${agentId}/services/${serviceId}`)');
  expect(source).toContain('variant="link"');
});
