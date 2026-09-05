import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, test, vi } from 'vitest';
import CommentToInboxPage from './CommentToInboxPage';

let queryCount = 0;
let loadingState = false;
let emptyAutomationState = false;
let automationState = false;
let pageQueryArgs: unknown;

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
  useQuery: (_query: unknown, args: unknown) => {
    queryCount += 1;
    if (queryCount === 2) pageQueryArgs = args;
    if (loadingState) return undefined;
    if (automationState) {
      return queryCount === 1
        ? [{ _id: 'automation-1', name: 'Pricing replies', status: 'inactive', sentCount: 4, respondedCount: 2 }]
        : queryCount === 2
          ? [{ _id: 'channel-1', service: 'instagram', displayUsername: 'Demo Instagram Page' }]
          : undefined;
    }
    if (emptyAutomationState) {
      return queryCount === 1
        ? []
        : queryCount === 2
          ? [{ _id: 'channel-1', service: 'instagram', displayUsername: 'Demo Instagram Page' }]
          : undefined;
    }
    return queryCount < 3 ? [] : undefined;
  },
}));

function renderPage() {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/comment-to-inbox']}>
      <Routes>
        <Route path="/dashboard/:agentId/comment-to-inbox" element={<CommentToInboxPage />} />
      </Routes>
    </MemoryRouter>
  );
}

test('guides users to connect a channel when no pages are connected', () => {
  loadingState = false;
  emptyAutomationState = false;
  automationState = false;
  queryCount = 0;
  pageQueryArgs = undefined;
  const markup = renderPage();

  expect(markup).toContain('No pages connected');
  expect(markup).toContain('Connect an Instagram or Messenger page to start creating Comment automations.');
  expect(markup).toContain('href="/dashboard/agent-1/channels"');
  expect(markup).toContain('Connect a channel');
  expect(markup).not.toContain('Create automation');
  expect(pageQueryArgs).toEqual({ agentId: 'agent-1' });
});

test('shows a skeleton while comment automation data is loading', () => {
  loadingState = true;
  emptyAutomationState = false;
  automationState = false;
  queryCount = 0;
  const markup = renderPage();

  expect(markup).toContain('Loading comment automations');
  expect(markup).not.toContain('>Loading</div>');
});

test('uses the empty component when no automations exist', () => {
  loadingState = false;
  emptyAutomationState = true;
  automationState = false;
  queryCount = 0;
  const markup = renderPage();

  expect(markup).toContain('data-slot="empty"');
  expect(markup).toContain('bg-muted/20');
  expect(markup).toContain('No automations yet');
  expect(markup).toContain('Create an automation to start sending messages when people comment.');
  expect(markup.match(/Create automation/g)).toHaveLength(2);
});

test('renders automation rows as openable detail actions', () => {
  loadingState = false;
  emptyAutomationState = false;
  automationState = true;
  queryCount = 0;
  const markup = renderPage();

  expect(markup).toContain('Pricing replies');
  expect(markup).toContain('aria-label="Open automation Pricing replies"');
  expect(markup).toContain('lucide-users');
  expect(markup).toContain('data-slot="tooltip-trigger"');
  expect(markup).toContain('aria-label="4 messages sent"');
  expect(markup).not.toContain('Responded 2');
  expect(markup).not.toContain('data-slot="dialog-content"');
});
