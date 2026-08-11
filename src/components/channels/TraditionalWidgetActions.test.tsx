import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { TraditionalWidgetActions } from './TraditionalWidgetActions';

describe('TraditionalWidgetActions', () => {
  test('renders separate enabled save and publish controls', () => {
    const markup = renderToStaticMarkup(
      <TraditionalWidgetActions
        activating={false}
        canActivate
        canSave
        saving={false}
        onActivate={() => undefined}
        onSave={() => undefined}
      />,
    );

    expect(markup).toContain('Save changes');
    expect(markup).toContain('Set as active widget');
    expect(markup).not.toContain('disabled=""');
  });

  test('disables both controls and labels the pending save', () => {
    const markup = renderToStaticMarkup(
      <TraditionalWidgetActions
        activating={false}
        canActivate={false}
        canSave={false}
        saving
        onActivate={() => undefined}
        onSave={() => undefined}
      />,
    );

    expect(markup).toContain('Saving…');
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
    expect(markup).toContain('aria-label="Loading"');
  });
});
