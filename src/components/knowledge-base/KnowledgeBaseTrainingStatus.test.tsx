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

  it('shows the active training count in a yellow rounded badge within a neutral pill', () => {
    const markup = renderToStaticMarkup(<KnowledgeBaseTrainingStatus trainingItemCount={2} onTest={() => undefined} />);

    expect(markup).toContain('text-yellow-950">2</span><span>training items</span>');
    expect(markup).toContain('bg-muted');
    expect(markup).toContain('rounded-full bg-yellow-400');
    expect(markup).not.toContain('bg-yellow-100');
  });

  it('shows the up-to-date check in a green rounded badge within a neutral pill', () => {
    const markup = renderToStaticMarkup(<KnowledgeBaseTrainingStatus trainingItemCount={0} onTest={() => undefined} />);

    expect(markup).toContain('Agent is up-to-date');
    expect(markup).toContain('bg-muted');
    expect(markup).toContain('rounded-full bg-emerald-600');
    expect(markup).toContain('text-white');
  });

  it('renders a roomier Test your agent button', () => {
    const markup = renderToStaticMarkup(<KnowledgeBaseTrainingStatus trainingItemCount={0} onTest={() => undefined} />);

    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="Test your agent"');
    expect(markup).toContain('px-4 py-2');
    expect(markup).toContain('hover:bg-muted-foreground/15');
  });
});
