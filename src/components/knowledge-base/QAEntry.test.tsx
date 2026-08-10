import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { QAEntry } from './QAEntry';

describe('QAEntry', () => {
  it('does not add an outer card border around question and answer fields', () => {
    const markup = renderToStaticMarkup(
      <QAEntry>
        <input placeholder="Enter question" />
      </QAEntry>,
    );

    expect(markup).toContain('Add Q&amp;A');
    expect(markup).not.toContain('class="rounded-lg border border-border bg-card p-4 space-y-3"');
  });
});
