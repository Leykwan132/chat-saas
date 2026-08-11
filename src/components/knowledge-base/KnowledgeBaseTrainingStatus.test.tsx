import { isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HoverCard } from '@/components/ui/hover-card';
import { KnowledgeBaseTrainingStatus } from './KnowledgeBaseTrainingStatus';

function collectReactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectReactText).join(' ');
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return collectReactText(node.props.children);
}

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

  it.each([
    {
      indexingStatus: { isIndexing: false, queued: 0, running: 0 },
      title: 'Agent is ready',
      detail: 'All knowledge changes are indexed and ready for your agent to use.',
    },
    {
      indexingStatus: { isIndexing: true, queued: 0, running: 1 },
      title: 'Training in progress',
      detail: 'Your latest knowledge changes are being trained and will be used once indexing finishes.',
    },
  ])('provides a hover card explaining $title', ({ indexingStatus, title, detail }) => {
    const element = KnowledgeBaseTrainingStatus({
      indexingStatus,
      isCheckingStatus: false,
    });

    expect(isValidElement(element) && element.type).toBe(HoverCard);
    expect(collectReactText(element)).toContain(title);
    expect(collectReactText(element)).toContain(detail);
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

  it('keeps the status pill non-clickable without a hover color treatment', () => {
    const markup = renderToStaticMarkup(
      <KnowledgeBaseTrainingStatus
        indexingStatus={{ isIndexing: false, queued: 0, running: 0 }}
        isCheckingStatus={false}
      />,
    );

    expect(markup).not.toContain('type="button"');
    expect(markup).not.toContain('hover:');
    expect(markup).toContain('px-4 py-2');
  });
});
