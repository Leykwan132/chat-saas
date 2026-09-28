import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowInspectorForm.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');
const mediaSectionSource = readFileSync(
  fileURLToPath(new URL('./WorkflowSendMediaSection.tsx', import.meta.url)),
  'utf8',
);
const inspectorSource = readFileSync(
  fileURLToPath(new URL('./WorkflowInspector.tsx', import.meta.url)),
  'utf8',
);
const escalationMessageControlSource = readFileSync(
  fileURLToPath(new URL('./WorkflowNodeEscalationMessageControl.tsx', import.meta.url)),
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

test('book appointment inspector shares the node service controls', () => {
  expect(source).not.toContain('WorkflowBookingInspectorRequirements');
  expect(source).not.toContain('WorkflowBookingInspectorServices');
  expect(source).toContain('WorkflowBookingNodeServices');
  expect(source).toContain('presentation="inspector"');
  expect(source).not.toContain('hasBookableService');
  expect(source).not.toContain('bookingAvailabilityBlocksApply(');
});

test('keeps workflow labels close to their booking controls', () => {
  expect(source).toContain('<Field className="items-start gap-2 text-left">');
});

test('uses the shared required label for condition and file requirements', () => {
  expect(source).toContain('<WorkflowRequiredLabel>Detail</WorkflowRequiredLabel>');
  expect(source).toMatch(/id="workflow-node-condition-detail"[\s\S]*?required/);
  expect(source).toContain('conditionDetailBlocksApply(');
});

test('places the escalation message control below Human escalation condition detail', () => {
  expect(source).toContain('WorkflowNodeEscalationMessageControl');
  expect(source).toMatch(
    /id="workflow-node-condition-detail"[\s\S]*?<WorkflowNodeEscalationMessageControl/,
  );
});

test('limits Human escalation editing to condition detail and its send-message control', () => {
  expect(source).toContain('const showConditionNameField = !isHumanEscalationAction');
  expect(source).toContain('{showConditionNameField ? (');
  expect(source).toContain('{!isHumanEscalationAction ? (');
  expect(source).toContain('name: isHumanEscalationAction ? node.title : name');
  expect(source).toContain(
    "description: isHumanEscalationAction ? (node.description ?? '') : hasGoalField ? goal : ''",
  );
});

test('gives Human escalation a narrower modal and a heading for its message section', () => {
  expect(inspectorSource).toContain('sm:max-w-[820px]');
  expect(source).toContain('presentation="inspector"');
  expect(escalationMessageControlSource).toMatch(/presentation === ["']inspector["']/);
  expect(escalationMessageControlSource).toContain('text-base font-semibold text-foreground');
  expect(escalationMessageControlSource).toContain('nodrag nopan mt-3 w-full');
});

test('explains incomplete requirements when Apply is attempted', () => {
  expect(source).toContain('attemptedApply');
  expect(source).toContain('Detail is required before applying.');
  expect(source).toContain('is required before applying.');
  expect(mediaSectionSource).toContain('Please add at least one photo or video before applying.');
  expect(mediaSectionSource).toContain('Please add at least one file before applying.');
});
