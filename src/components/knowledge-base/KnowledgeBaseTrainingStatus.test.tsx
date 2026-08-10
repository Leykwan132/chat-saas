import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { KnowledgeBaseTrainingStatus } from './KnowledgeBaseTrainingStatus';

describe('Knowledge Base training status', () => {
  it('shows nothing before the first polling result is available', () => {
    const markup = renderToStaticMarkup(
      <KnowledgeBaseTrainingStatus
        indexingStatus={null}
        isCheckingStatus
      />,
    );

    expect(markup).toBe('');
  });

  it('keeps the latest result visible during a background status check', () => {
    const markup = renderToStaticMarkup(
      <KnowledgeBaseTrainingStatus
        indexingStatus={{ isIndexing: false, queued: 0, running: 0 }}
        isCheckingStatus
      />,
    );

    expect(markup).toContain('Your agent is ready.');
    expect(markup).not.toContain('Checking status…');
  });

  it('shows the Test your agent training label in a yellow rounded badge state', () => {
    const markup = renderToStaticMarkup(
      <KnowledgeBaseTrainingStatus
        indexingStatus={{ isIndexing: true, queued: 0, running: 1 }}
        isCheckingStatus={false}
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
      />,
    );

    expect(markup).toContain('Your agent is ready.');
    expect(markup).toContain('bg-muted');
    expect(markup).toContain('rounded-full bg-emerald-600');
    expect(markup).toContain('text-white');
  });

  it('renders a static status pill without an interactive hover affordance', () => {
    const markup = renderToStaticMarkup(
      <KnowledgeBaseTrainingStatus
        indexingStatus={{ isIndexing: false, queued: 0, running: 0 }}
        isCheckingStatus={false}
      />,
    );

    expect(markup).not.toContain('type="button"');
    expect(markup).not.toContain('tabindex=');
    expect(markup).not.toContain('data-state=');
    expect(markup).not.toContain('focus-visible:');
    expect(markup).toContain('px-4 py-2');
  });
});
