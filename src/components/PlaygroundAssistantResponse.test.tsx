import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { PlaygroundAssistantResponse } from './PlaygroundAssistantResponse';

describe('PlaygroundAssistantResponse', () => {
  test('makes completed responses keyboard-accessible', () => {
    const markup = renderToStaticMarkup(
      <PlaygroundAssistantResponse expandable onExpand={() => undefined}>
        Response content
      </PlaygroundAssistantResponse>,
    );

    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('Response content');
  });

  test('leaves pending responses non-interactive', () => {
    const markup = renderToStaticMarkup(
      <PlaygroundAssistantResponse expandable={false} onExpand={() => undefined}>
        Response content
      </PlaygroundAssistantResponse>,
    );

    expect(markup).not.toContain('role="button"');
    expect(markup).not.toContain('tabindex="0"');
  });
});
