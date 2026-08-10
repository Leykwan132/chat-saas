import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { PlaygroundAssistantResponseDialogContent } from './PlaygroundAssistantResponseDialog';

describe('PlaygroundAssistantResponseDialogContent', () => {
  test('renders a viewport-filling scrollable response view', () => {
    const markup = renderToStaticMarkup(
      <PlaygroundAssistantResponseDialogContent title="Agent response">
        <p>Response content</p>
      </PlaygroundAssistantResponseDialogContent>,
    );

    expect(markup).toContain('Agent response');
    expect(markup).toContain('Response content');
    expect(markup).toContain('h-[min(92vh,960px)]');
    expect(markup).toContain('overflow-y-auto');
  });
});
