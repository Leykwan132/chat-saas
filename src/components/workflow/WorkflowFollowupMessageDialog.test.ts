import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowFollowupMessageDialog.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('follow-up message dialog commits pending templates only on confirm', () => {
  expect(source).toContain('pendingMessageStrategy');
  expect(source).toContain('pendingSameTemplate');
  expect(source).toContain('pendingAttemptTemplates');
  expect(source).toContain('setPendingSameTemplate(selection)');
  expect(source).toContain('setPendingAttemptTemplates');
  expect(source).toContain('setFollowupMessageStrategy(pendingMessageStrategy)');
  expect(source).toContain('onClick={confirmTemplates}');
  expect(source).toContain('onCloseAutoFocus={resetPendingConfiguration}');
  expect(source).toContain('disabled={!canConfirmTemplates}');
  expect(source).toContain('DialogClose asChild');
  expect(source).toContain('Confirm');
});
