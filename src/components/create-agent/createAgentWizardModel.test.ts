import { expect, test } from 'vitest';
import { hasRequiredIdentity } from './createAgentWizardModel';

test('requires trimmed agent and business names', () => {
  expect(hasRequiredIdentity({ name: 'Nova', businessName: 'Northstar' })).toBe(true);
  expect(hasRequiredIdentity({ name: ' ', businessName: 'Northstar' })).toBe(false);
  expect(hasRequiredIdentity({ name: 'Nova', businessName: ' ' })).toBe(false);
});
