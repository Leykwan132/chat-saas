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
  expect(markup).toContain('Set when you’re available to receive leads and bookings.');
  expect(markup).not.toContain('Back to dashboard');
  expect(markup).not.toContain('/dashboard/agent-1/availability/user-ley/edit');
  expect(markup).not.toContain('Ley Kwan Choo (You)');
  expect(markup).not.toContain('ley@example.com');
  expect(markup).not.toContain('>Owner</span>');
  expect(markup).not.toContain('>Active</span>');
  expect(markup.indexOf('Time off')).toBeLessThan(markup.indexOf('Request time off'));
});

test('matches the personal Availability layout while details load', () => {
  mocks.useQuery
    .mockReturnValueOnce(undefined)
    .mockReturnValueOnce({ workosUserId: 'user-ley' });

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
  expect(markup).toContain('Set when you’re available to receive leads and bookings.');
});
