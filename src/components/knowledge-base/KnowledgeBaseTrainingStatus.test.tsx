import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { isTraining } from './helpers';
import { KnowledgeBaseTrainingStatus } from './KnowledgeBaseTrainingStatus';

describe('Knowledge Base training status', () => {
  it('counts preparation states as training but excludes deletions', () => {
    expect(isTraining('queued')).toBe(true);
    expect(isTraining('gettingMarkdown')).toBe(true);
    expect(isTraining('deleting')).toBe(false);
    expect(isTraining('completed')).toBe(false);
  });

  it('shows the yellow training pill with the active item count', () => {
    const markup = renderToStaticMarkup(<KnowledgeBaseTrainingStatus trainingItemCount={2} />);

    expect(markup).toContain('2 training items');
    expect(markup).toContain('bg-yellow-100');
  });

  it('shows an up-to-date confirmation when training is complete', () => {
    const markup = renderToStaticMarkup(<KnowledgeBaseTrainingStatus trainingItemCount={0} />);

    expect(markup).toContain('Agent is up-to-date');
    expect(markup).toContain('bg-emerald-600');
    expect(markup).toContain('text-white');
  });
});
