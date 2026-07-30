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
    expect(navigationSource).not.toContain('Set it up with Workflow.');
    expect(navigationSource).toContain('Try Workflow');
  });

  it('matches the Workflow action size with a softer headline weight', () => {
    expect(navigationSource).toContain(
      'className="text-sm font-normal leading-snug text-foreground"',
    );
    expect(navigationSource).not.toContain('text-sm font-semibold leading-snug');
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
