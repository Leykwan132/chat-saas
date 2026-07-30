import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { KnowledgeBaseNavigation } from './KnowledgeBaseNavigation';

const navigationSource = readFileSync(
  new URL('./KnowledgeBaseNavigation.tsx', import.meta.url),
  'utf8',
);
const pageSource = readFileSync(
  new URL('../../pages/KnowledgeBasePage.tsx', import.meta.url),
  'utf8',
);

describe('Knowledge Base Workflow promotion', () => {
  it('shows direct Workflow capability copy beneath Sources', () => {
    expect(navigationSource).toContain(
      'Need your AI agent to send images, videos, reminders, or follow-ups?',
    );
    expect(navigationSource).not.toContain('Set it up with Workflow.');
    expect(navigationSource).toContain('Try Workflow');
  });

  it('places the approved title above the supporting line', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        {},
        createElement(KnowledgeBaseNavigation, {
          activeType: 'web',
          onSelect: () => undefined,
          workflowHref: '/dashboard/agent-id/workflow',
        }),
      ),
    );
    const title = 'Do More Automatically';
    const supportingLine =
      'Need your AI agent to send images, videos, reminders, or follow-ups?';

    expect(markup.indexOf(title)).toBeGreaterThan(-1);
    expect(markup.indexOf(title)).toBeLessThan(
      markup.indexOf(supportingLine),
    );
    expect(markup).toContain(
      'class="text-sm font-semibold leading-snug text-foreground"',
    );
    expect(markup).toContain(
      'class="mt-1.5 text-sm font-normal leading-snug text-foreground"',
    );
  });

  it('shows the approved minimal banner above the promotion copy', () => {
    expect(navigationSource).toContain(
      'src="https://storage.kilobot.app/grad-2.jpg"',
    );
    expect(navigationSource).toContain('alt=""');
    expect(navigationSource).toContain(
      'className="aspect-video w-full object-cover"',
    );
    expect(navigationSource.indexOf('<img')).toBeLessThan(
      navigationSource.indexOf(
        'Need your AI agent to send images, videos, reminders, or follow-ups?',
      ),
    );
  });

  it('links to the current agent Workflow', () => {
    expect(navigationSource).toContain('workflowHref');
    expect(pageSource).toContain(
      'workflowHref={`/dashboard/${agentId}/workflow`}',
    );
  });
});
