import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { TextKnowledgeEditForm } from './TextKnowledgeEditForm';

describe('TextKnowledgeEditForm', () => {
  test('gives the content editor the remaining sheet height', () => {
    const markup = renderToStaticMarkup(
      <TextKnowledgeEditForm
        content="Knowledge content"
        onContentChange={() => undefined}
        onTitleChange={() => undefined}
        title="Pricing"
      />,
    );

    expect(markup).toContain('Knowledge content');
    expect(markup).toContain('min-h-0 flex-1 flex-col');
    expect(markup).toContain('min-h-0 flex-1 w-full');
  });
});
