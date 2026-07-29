import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const source = readFileSync(
  new URL('./AdjustPlanPickerDialog.tsx', import.meta.url),
  'utf8',
);

describe('AdjustPlanPickerDialog', () => {
  test('keeps the Choose your plan header simple', () => {
    expect(source).toContain('Choose your plan');
    expect(source).not.toContain('Manage plan');
    expect(source).not.toContain('AdjustPlanManageAction');
    expect(source).not.toContain(
      'onManagePlan',
    );
  });
});
