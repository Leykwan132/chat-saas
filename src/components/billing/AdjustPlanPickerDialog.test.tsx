import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { AdjustPlanManageAction } from './AdjustPlanPickerDialog';

describe('AdjustPlanManageAction', () => {
  test('offers plan management from the Adjust Plan modal', () => {
    const markup = renderToStaticMarkup(
      <AdjustPlanManageAction
        disabled={false}
        onManagePlan={() => undefined}
      />,
    );

    expect(markup).toContain('Manage plan');
    expect(markup).toContain('data-variant="ghost"');
  });
});
