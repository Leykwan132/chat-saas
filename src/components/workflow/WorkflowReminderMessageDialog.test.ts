import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowReminderMessageDialog.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('reminder message dialog commits its pending template only on confirm', () => {
  expect(source).toContain('DialogFooter');
  expect(source).toContain('DialogClose asChild');
  expect(source).toContain('const [pendingTemplate, setPendingTemplate]');
  expect(source).toContain('selectedTemplateKey={pendingTemplate?.key ?? \'\'}');
  expect(source).toContain('setPendingTemplate(toWorkflowFollowupTemplateSelection(template))');
  expect(source).toContain('setReminderTemplate(pendingTemplate)');
  expect(source).toContain('onClick={confirmTemplate}');
  expect(source).toContain('onCloseAutoFocus={resetPendingTemplate}');
  expect(source).toContain('disabled={!pendingTemplate}');
  expect(source).toContain('Confirm');
});
