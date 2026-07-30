import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
    expect(navigationSource).toContain('Set it up with Workflow.');
    expect(navigationSource).toContain('Try Workflow');
  });

  it('links to the current agent Workflow', () => {
    expect(navigationSource).toContain('workflowHref');
    expect(pageSource).toContain(
      'workflowHref={`/dashboard/${agentId}/workflow`}',
    );
  });
});
