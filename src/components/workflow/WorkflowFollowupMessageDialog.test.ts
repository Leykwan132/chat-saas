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

test('follow-up message dialog uses the enlarged viewport-safe preview layout', () => {
  expect(source).toContain('h-[988px]');
  expect(source).toContain('max-h-[calc(100vh-2rem)]');
  expect(source).toContain('w-[calc(100vw-2rem)]');
  expect(source).toContain('max-w-[1274px]');
  expect(source).toContain('sm:max-w-[1274px]');
  expect(source).not.toContain('h-[760px]');
  expect(source).not.toContain('max-w-[980px]');
});

test('one attempt opens the single-message picker without strategy navigation', () => {
  expect(source).toContain('const singleAttempt = maxAttemptsCount === 1;');
  expect(source).toContain("const initialMessageStage = singleAttempt ? 'configure' : initialStage;");
  expect(source).toContain("const initialMessageStrategy = singleAttempt ? 'same' : followupMessageStrategy;");
  expect(source).toContain("singleAttempt && followupMessageStrategy === 'different'");
  expect(source).toContain('? followupAttemptTemplates[0]');
  expect(source).toContain('useState<MessageStage>(initialMessageStage)');
  expect(source).toContain('useState(initialMessageStrategy)');
  expect(source).toContain('useState(initialSameTemplate)');
  expect(source).toContain('setStage(initialMessageStage)');
  expect(source).toContain('setPendingMessageStrategy(initialMessageStrategy)');
  expect(source).toContain('setPendingSameTemplate(initialSameTemplate)');
  expect(source).toContain('onOpenAutoFocus={resetPendingConfiguration}');
  expect(source).toContain("singleAttempt ? 'justify-end sm:justify-end'");
  expect(source).toContain('{!singleAttempt && (');
});
