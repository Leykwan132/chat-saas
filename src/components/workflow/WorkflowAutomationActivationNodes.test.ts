import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

function readSource(filename: string) {
  return readFileSync(fileURLToPath(new URL(filename, import.meta.url)), 'utf8');
}

test.each([
  [
    './WorkflowReminderSetupNode.tsx',
    'dialogContent={<WorkflowReminderMessageDialog />}',
  ],
  [
    './WorkflowFollowupSetupNode.tsx',
    'dialogContent={<WorkflowFollowupMessageDialog />}',
  ],
])('%s guards draft activation without claiming it was saved', (
  filename,
  messageRowMarker,
) => {
  const source = readSource(filename);
  const messageRowIndex = source.indexOf(messageRowMarker);
  const validationMessageIndex = source.indexOf(
    '{showMessageRequiredError && messageMissing && (',
  );

  expect(source).toContain('resolveWorkflowAutomationEnabledChange');
  expect(source).toContain('setShowMessageRequiredError(result.messageRequired)');
  expect(source).toContain('WORKFLOW_AUTOMATION_MESSAGE_REQUIRED_ERROR');
  expect(source).toContain('text-destructive');
  expect(messageRowIndex).toBeGreaterThan(-1);
  expect(validationMessageIndex).toBeGreaterThan(messageRowIndex);
  expect(source).not.toContain("import { toast } from 'sonner'");
  expect(source).not.toContain('toast.success(');
});

test.each([
  './WorkflowReminderSetupNode.tsx',
  './WorkflowFollowupSetupNode.tsx',
])('%s shows a color-coded state label before its switch', (filename) => {
  const source = readSource(filename);
  const statusLabelIndex = source.indexOf("automation.enabled ? 'Active' : 'Inactive'");
  const switchIndex = source.indexOf('<Switch', statusLabelIndex);

  expect(source).toContain("automation.enabled ? 'text-emerald-600' : 'text-muted-foreground'");
  expect(source).toContain("'w-14 text-right text-xs font-medium'");
  expect(source).toContain('aria-hidden="true"');
  expect(statusLabelIndex).toBeGreaterThan(-1);
  expect(switchIndex).toBeGreaterThan(statusLabelIndex);
});
