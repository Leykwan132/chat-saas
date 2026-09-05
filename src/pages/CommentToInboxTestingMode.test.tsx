import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, test, vi } from 'vitest';

let queryCount = 0;

vi.mock('../../shared/commentAutomationConfig', () => ({
  isTesting: true,
}));

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
  useQuery: () => {
    queryCount += 1;
    return queryCount < 3 ? [] : undefined;
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

test('allows the automation form to open without connected pages in testing mode', async () => {
  const { default: CommentToInboxPage } = await import('./CommentToInboxPage');
  queryCount = 0;
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/comment-to-inbox']}>
      <Routes>
        <Route path="/dashboard/:agentId/comment-to-inbox" element={<CommentToInboxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(markup).toContain('Create automation');
  expect(markup).not.toContain('No pages connected');
  expect(markup).toContain('Demo Instagram Page');
  expect(markup).toContain('Demo Facebook Page');
});
