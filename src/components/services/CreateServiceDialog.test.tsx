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

test('keeps creation focused on name, location, and duration without advanced settings', () => {
  const source = readFileSync(new URL('./CreateServiceInfoStep.tsx', import.meta.url), 'utf8');

  expect(source).toContain('CreateServiceBasicsFields');
  expect(source).not.toContain('ServiceDetailsFields');
  expect(source).not.toContain('ServiceTimingFields');

  const dialogSource = readFileSync(new URL('./CreateServiceDialog.tsx', import.meta.url), 'utf8');
  expect(dialogSource).not.toContain('border-t pt-4');
});

test('inherits the shared backdrop with a tighter modal radius', () => {
  const source = readFileSync(new URL('./CreateServiceDialog.tsx', import.meta.url), 'utf8');

  expect(source).not.toContain('overlayClassName=');
  expect(source).toContain('rounded-3xl');
});

test('uses a ghost button to close the dialog', () => {
  const source = readFileSync(new URL('./CreateServiceDialog.tsx', import.meta.url), 'utf8');

  expect(source).toContain('variant="ghost" className="text-muted-foreground" onClick={closeDialog}>Close</Button>');
});

test('keeps Create available to explain a missing service name', () => {
  const source = readFileSync(new URL('./CreateServiceDialog.tsx', import.meta.url), 'utf8');

  expect(source).not.toContain('disabled={saving || !form.name.trim()}');
  expect(source).toContain('nameInputRef.current?.focus()');
});
