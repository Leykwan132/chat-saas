import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { InboxEscalationDivider } from './InboxEscalationDivider';

test('reveals the stored escalation reason in a neutral disclosure', () => {
  const markup = renderToStaticMarkup(
    <InboxEscalationDivider
      escalation={{
        id: 'escalation-1',
        sourceMessageId: 'message-1',
        question: 'Can I speak with a person?',
        context: 'The customer requested a refund review.',
        escalatedAt: 1,
      }}
    />,
  );

  expect(markup).toContain('<details');
  expect(markup).toContain('Can I speak with a person?');
  expect(markup).toContain('The customer requested a refund review.');
  expect(markup).toContain('Why it needs a human');
  expect(markup).toContain('text-sm');
  expect(markup).toContain('border-zinc-200');
  expect(markup).toContain('triangle-alert');
  expect(markup).not.toContain('circle-help');
  expect(markup).not.toContain('amber');
});
