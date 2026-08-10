import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { KnowledgeBaseTrainingStatus } from './KnowledgeBaseTrainingStatus';

describe('Knowledge Base training status', () => {
  it('shows the Test your agent training label in a yellow rounded badge state', () => {
    const markup = renderToStaticMarkup(
      <KnowledgeBaseTrainingStatus
        indexingStatus={{ isIndexing: true, queued: 0, running: 1 }}
        isCheckingStatus={false}
        onTest={() => undefined}
      />,
    );

    expect(markup).toContain('Training 1 item…');
    expect(markup).toContain('bg-muted');
    expect(markup).toContain('rounded-full bg-yellow-400');
  });

  it('shows the Test your agent ready label in a green rounded badge state', () => {
    const markup = renderToStaticMarkup(
      <KnowledgeBaseTrainingStatus
        indexingStatus={{ isIndexing: false, queued: 0, running: 0 }}
        isCheckingStatus={false}
        onTest={() => undefined}
      />,
    );

    expect(markup).toContain('Your agent is ready.');
    expect(markup).toContain('bg-muted');
    expect(markup).toContain('rounded-full bg-emerald-600');
    expect(markup).toContain('text-white');
  });

  it('renders a roomier Test your agent button', () => {
    const markup = renderToStaticMarkup(
      <KnowledgeBaseTrainingStatus
        indexingStatus={{ isIndexing: false, queued: 0, running: 0 }}
        isCheckingStatus={false}
        onTest={() => undefined}
      />,
    );

    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="Test your agent"');
    expect(markup).toContain('px-4 py-2');
    expect(markup).toContain('hover:bg-muted-foreground/15');
  });
});
