import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import ScheduleUserAvailabilityPage from './ScheduleUserAvailabilityPage';

const mocks = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useMutation: mocks.useMutation,
  useQuery: mocks.useQuery,
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, isLoading: false }),
}));

beforeEach(() => {
  mocks.useMutation.mockReset();
  mocks.useQuery.mockReset();
  mocks.useMutation.mockReturnValue(vi.fn());
});

test('keeps the owner edit route around the extracted editor', () => {
  mocks.useQuery.mockReturnValue({ workosUserId: 'user-ada' });

  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/availability/user-ada/edit']}>
      <Routes>
        <Route
          path="/dashboard/:agentId/availability/:workosUserId/edit"
          element={<ScheduleUserAvailabilityPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

  expect(markup).toContain('Available hours');
  expect(markup).toContain('Back');
});
