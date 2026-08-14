import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowInspectorForm.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');
const bookingRequirementsSource = readFileSync(
  fileURLToPath(new URL('./WorkflowBookingInspectorRequirements.tsx', import.meta.url)),
  'utf8',
);
const mediaSectionSource = readFileSync(
  fileURLToPath(new URL('./WorkflowSendMediaSection.tsx', import.meta.url)),
  'utf8',
);

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

test('book appointment only requires a selected active service', () => {
  expect(source).toContain('<WorkflowBookingInspectorRequirements');
  expect(bookingRequirementsSource).toContain('<WorkflowBookingServicesSection');
  expect(bookingRequirementsSource).not.toContain('WorkflowBookingAvailabilitySection');
  expect(source).not.toContain('bookingAvailabilityBlocksApply(');
});

test('keeps workflow labels close to their booking controls', () => {
  expect(source).toContain('<Field className="items-start gap-2 text-left">');
  expect(bookingRequirementsSource).toContain('<div className="flex flex-col gap-3">');
});

test('uses the shared required label for condition, booking, and file requirements', () => {
  expect(source).toContain('<WorkflowRequiredLabel>Detail</WorkflowRequiredLabel>');
  expect(source).toMatch(/id="workflow-node-condition-detail"[\s\S]*?required/);
  expect(bookingRequirementsSource).toContain('<WorkflowRequiredLabel as="h4">{title}</WorkflowRequiredLabel>');
  expect(source).toContain('conditionDetailBlocksApply(');
});

test('explains incomplete requirements when Apply is attempted', () => {
  expect(source).toContain('attemptedApply');
  expect(source).toContain('Detail is required before applying.');
  expect(source).toContain('is required before applying.');
  expect(bookingRequirementsSource).toContain('Select at least one active service before applying.');
  expect(bookingRequirementsSource).not.toContain('Select at least one teammate who can accept appointment leads.');
  expect(mediaSectionSource).toContain('Please add at least one photo or video before applying.');
  expect(mediaSectionSource).toContain('Please add at least one file before applying.');
});

test('uses the matching sidebar icon for services', () => {
  expect(bookingRequirementsSource).toContain('ShoppingCart');
  expect(bookingRequirementsSource).not.toContain('Clock3');
});
