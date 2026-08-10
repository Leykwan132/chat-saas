import { existsSync, readFileSync } from 'node:fs';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { KnowledgeBaseHeader } from './KnowledgeBaseHeader';

const headerUrl = new URL('./KnowledgeBaseHeader.tsx', import.meta.url);
const headerSource = existsSync(headerUrl) ? readFileSync(headerUrl, 'utf8') : '';
const pageSource = readFileSync(
  new URL('../../pages/KnowledgeBasePage.tsx', import.meta.url),
  'utf8',
);
const testLayoutUrl = new URL('./KnowledgeBaseTestLayout.tsx', import.meta.url);
const testLayoutSource = existsSync(testLayoutUrl)
  ? readFileSync(testLayoutUrl, 'utf8')
  : '';

describe('Knowledge Base header', () => {
  it('offers agent testing', () => {
    expect(headerSource).toContain('title="Knowledge Base"');
    expect(headerSource).toContain(
      'Build your agent’s knowledge here. Your sources are never revealed to users.',
    );
    expect(headerSource).toContain('Test your agent');
    expect(headerSource).toContain('variant="outline"');
  });

  it('places the training status beside Test your agent', () => {
    const markup = renderToStaticMarkup(
      createElement(KnowledgeBaseHeader, {
        isTestOpen: false,
        onTest: () => undefined,
        onOpenTest: () => undefined,
        trainingItemCount: 0,
      }),
    );

    expect(markup).toContain('Agent is up-to-date');
    expect(markup.indexOf('Agent is up-to-date')).toBeLessThan(markup.lastIndexOf('Test your agent'));
  });

  it('opens the shared test chat as its own in-page container', () => {
    expect(pageSource).toContain('const [isTestOpen, setIsTestOpen] = useState(false)');
    expect(pageSource).toContain('KnowledgeBaseTestLayout');
    expect(pageSource).toContain(
      'showTestPanel={isTestOpen && Boolean(selectedAgentId)}',
    );
    expect(pageSource).toContain('mode="inline"');
    expect(pageSource).not.toContain('mode="drawer"');
    expect(pageSource).toContain('open={isTestOpen}');
    expect(pageSource).toContain('onOpenChange={setIsTestOpen}');
    expect(pageSource).toContain('isTestOpen={isTestOpen}');
    expect(pageSource).toContain('onTest={() => setIsTestOpen(toggleTestOpen)}');
    expect(pageSource).not.toContain('onTest={() => setIsTestOpen(true)}');
    expect(pageSource).toContain('onOpenTest={() => setIsTestOpen(true)}');
    expect(headerSource).toContain('aria-pressed={isTestOpen}');
  });

  it('inverts the test panel state and exposes the open state', async () => {
    const headerModule = await import('./KnowledgeBaseHeader');
    const toggleTestOpen = (
      headerModule as typeof headerModule & {
        toggleTestOpen?: (current: boolean) => boolean;
      }
    ).toggleTestOpen;

    expect(toggleTestOpen?.(false)).toBe(true);
    expect(toggleTestOpen?.(true)).toBe(false);

    const Header = headerModule.KnowledgeBaseHeader as unknown as (props: {
      isTestOpen: boolean;
      onTest: () => void;
      onOpenTest: () => void;
      trainingItemCount: number;
    }) => ReactElement<Record<string, unknown>>;
    const header = Header({
      isTestOpen: true,
      onTest: () => undefined,
      onOpenTest: () => undefined,
      trainingItemCount: 0,
    });
    const children = header.props.children as ReactElement<
      Record<string, unknown>
    >[];

    const actions = children[1].props.children as ReactElement<
      Record<string, unknown>
    >[];

    expect(actions[1].props['aria-pressed']).toBe(true);
  });

  it('keeps Knowledge Base content intact beside the responsive test panel', () => {
    expect(testLayoutSource).toContain(
      "showTestPanel && 'xl:grid-cols-[minmax(0,1fr)_380px]'",
    );
    expect(testLayoutSource).toContain(
      '<div className="min-w-0">{children}</div>',
    );
    expect(testLayoutSource).toContain('{testPanel}');
  });
});
