import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { InboxActionHistory } from './InboxActionHistory';

test('renders an escalation with the production action-history timeline', () => {
  const markup = renderToStaticMarkup(
    <InboxActionHistory
      open
      logs={[{
        id: 'dummy-inbox-escalation',
        action: 'escalation_raised',
        metadata: {
          question: 'Can I speak with a person?',
          context: 'The customer requested help with a duplicate charge.',
          sourceMessageId: 'dummy-inbox-escalation-message',
        },
        performedAt: Date.now(),
        actorType: 'ai',
        actorName: 'AI',
      }]}
      onOpenChange={() => undefined}
      onFocusEscalation={() => undefined}
    />,
  );

  expect(markup).toContain('Action History');
  expect(markup).toContain('Human escalation');
  expect(markup).toContain('raised');
  expect(markup).toContain('by');
  expect(markup).toContain('AI');
  expect(markup).toContain('View in chat');
});
