import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import { InboxConversationComposer } from './InboxConversationComposer';

vi.mock('convex/react', () => ({ useQuery: () => ({ name: 'Customer Care' }) }));
vi.mock('./InboxReplyInput', () => ({
  InboxReplyInput: () => <textarea aria-label="Reply" />,
}));
vi.mock('./ConversationWindowBanner', () => ({
  ConversationWindowBanner: () => <div>Conversation window</div>,
}));

function renderComposer(aiHandling: boolean, canTakeControl = true, takingControl = false) {
  return renderToStaticMarkup(
    <InboxConversationComposer
      agentId={'agent-1' as Id<'agents'>}
      aiHandling={aiHandling}
      canTakeControl={canTakeControl}
      takingControl={takingControl}
      onTakeControl={() => undefined}
      canReplyFromInbox
      service="whatsapp"
      value=""
      onChange={() => undefined}
      onSubmit={() => undefined}
    />,
  );
}

test('replaces the composer with the actual agent name and only the takeover action', () => {
  const markup = renderComposer(true);
  expect(markup).toContain('Customer Care');
  expect(markup).toContain('Handling this conversation');
  expect(markup).toContain('Take control');
  expect(markup.match(/<button/g)).toHaveLength(1);
  expect(markup).not.toContain('<textarea');
  expect(markup).toContain('Conversation window');
});

test('restores the reply input when AI handling is disabled', () => {
  const markup = renderComposer(false);
  expect(markup).toContain('<textarea');
  expect(markup).not.toContain('Take control');
});

test('disables takeover without assignment permission', () => {
  expect(renderComposer(true, false)).toMatch(/<button[^>]*disabled/);
});

test('disables repeated takeover while the update is pending', () => {
  const markup = renderComposer(true, true, true);
  expect(markup).toMatch(/<button[^>]*disabled/);
  expect(markup).toContain('Taking control');
});
