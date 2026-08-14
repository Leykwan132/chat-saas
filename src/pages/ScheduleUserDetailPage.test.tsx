import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import ScheduleUserDetailPage from './ScheduleUserDetailPage';

const mocks = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useMutation: mocks.useMutation,
  useQuery: mocks.useQuery,
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, isLoading: false, role: 'owner' }),
}));

vi.mock('@/hooks/useActiveTeam', () => ({
  useActiveTeam: () => ({ activeTeam: { type: 'personal' } }),
}));

beforeEach(() => {
  mocks.useMutation.mockReset();
  mocks.useQuery.mockReset();
  mocks.useMutation.mockReturnValue(vi.fn());
});

test('shows personal availability inline without dashboard back navigation', () => {
  const currentUser = {
    workosUserId: 'user-ley',
    email: 'ley@example.com',
    firstName: 'Ley',
    lastName: 'Kwan Choo',
  };
  const detail = {
    user: { ...currentUser, role: 'owner' },
    schedule: {
      _id: 'schedule-ley',
      enabled: true,
      timezone: 'Asia/Kuala_Lumpur',
    },
    shifts: [{ dayOfWeek: 1, startMinutes: 540, endMinutes: 1020 }],
    timeOff: [],
  };

  mocks.useQuery
    .mockReturnValueOnce(detail)
    .mockReturnValueOnce(currentUser);

  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/availability/user-ley']}>
      <Routes>
        <Route
          path="/dashboard/:agentId/availability/:workosUserId"
          element={<ScheduleUserDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

  expect(markup).toContain('Availability</h1>');
  expect(markup).not.toContain('Back to dashboard');
  expect(markup).not.toContain('/dashboard/agent-1/availability/user-ley/edit');
});
