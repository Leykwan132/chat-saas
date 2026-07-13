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
    "toast.success('Reminders are now turned on.')",
  ],
  [
    './WorkflowFollowupSetupNode.tsx',
    'dialogContent={<WorkflowFollowupMessageDialog />}',
    "toast.success('Follow-up is now turned on.')",
  ],
])('%s guards activation and confirms successful activation', (
  filename,
  messageRowMarker,
  successToast,
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
  expect(source).toContain("import { toast } from 'sonner'");
  expect(source).toContain('if (result.enabled && !enabled)');
  expect(source).toContain(successToast);
});
