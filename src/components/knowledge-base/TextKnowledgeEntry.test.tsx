import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TextKnowledgeEntry } from './TextKnowledgeEntry';

describe('TextKnowledgeEntry', () => {
  it('does not add an outer card border around the text fields', () => {
    const markup = renderToStaticMarkup(
      <TextKnowledgeEntry>
        <input placeholder="Knowledge title" />
      </TextKnowledgeEntry>,
    );

    expect(markup).toContain('Add Text');
    expect(markup).not.toContain('class="rounded-lg border border-border bg-card p-4 space-y-3"');
  });
});
