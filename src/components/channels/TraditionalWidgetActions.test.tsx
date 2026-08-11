import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { TraditionalWidgetActions } from './TraditionalWidgetActions';

describe('TraditionalWidgetActions', () => {
  test('renders one enabled save control', () => {
    const markup = renderToStaticMarkup(
      <TraditionalWidgetActions
        canSave
        saving={false}
        onSave={() => undefined}
      />,
    );

    expect(markup).toContain('Save changes');
    expect(markup).not.toContain('Set as active widget');
    expect(markup).not.toContain('disabled=""');
  });

  test('disables the control and labels the pending save', () => {
    const markup = renderToStaticMarkup(
      <TraditionalWidgetActions
        canSave={false}
        saving
        onSave={() => undefined}
      />,
    );

    expect(markup).toContain('Saving…');
    expect(markup.match(/disabled=""/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Loading"');
  });
});
