import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('applies bounded reconciliation and cancellation only after atomic Save', () => {
  const saveSource = readFileSync(new URL('./workflowDraftSave.ts', import.meta.url), 'utf8');
  expect(saveSource).toContain('applyWorkflowAutomationSaveEffects');
  expect(saveSource.indexOf('await ctx.db.patch(workflow._id')).toBeLessThan(
    saveSource.indexOf('await applyWorkflowAutomationSaveEffects'),
  );
});

test('uses separate Workpools for reminder and follow-up lifecycle work', () => {
  const configSource = readFileSync(new URL('./convex.config.ts', import.meta.url), 'utf8');
  expect(configSource).toContain('workflowReminderWorkpool');
  expect(configSource).toContain('workflowFollowUpWorkpool');
});

test('deactivation cancels reconciliation jobs before pending send jobs', () => {
  const source = readFileSync(new URL('./workflowAutomationLifecycle.ts', import.meta.url), 'utf8');
  expect(source).toContain("reconciliation.operationKind !== 'reconcile'");
  expect(source).toContain('await pool.cancel(ctx, reconciliation.currentWorkId as WorkId)');
});
