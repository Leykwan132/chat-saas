import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowInspectorForm.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('workflow inspector explains condition and action sections', () => {
  expect(source).toContain('Decide when this node should run in the conversation.');
  expect(source).toContain('Define what the AI should do after the condition matches.');
  expect(source).toContain('FieldDescription className="text-xs"');
});

test('workflow inspector allows immediate media and keeps Apply icon-free', () => {
  expect(source).not.toContain('Save the workflow first');
  expect(source).not.toContain('isDraftWorkflowNodeId');
  expect(source).not.toContain('<Check');
  expect(source).toContain('hasMediaSection && agentId');
  expect(source).toContain('<Loader2');
});

test('book appointment places availability below services and gates Apply', () => {
  expect(source).toContain('<WorkflowBookingAvailabilitySection');
  expect(source.indexOf('<WorkflowBookingServicesSection')).toBeLessThan(
    source.indexOf('<WorkflowBookingAvailabilitySection'),
  );
  expect(source).toContain('bookingAvailabilityBlocksApply(');
  expect(source).toContain('onEligibilityChange={setHasAcceptingLeadMember}');
});

test('keeps workflow labels close to their booking controls', () => {
  expect(source).toContain('<Field className="items-start gap-2 text-left">');
  expect(source).toContain('<div className="flex flex-col gap-3">');
});
