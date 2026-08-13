import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import SchedulePage from './SchedulePage';

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
  mocks.useQuery.mockReset();
  mocks.useMutation.mockReset();
  mocks.useMutation.mockReturnValue(vi.fn());
});

test('shows saved weekly hours on each availability card', () => {
  const ley = {
    workosUserId: 'user-ley',
    email: 'ley@example.com',
    firstName: 'Ley',
    lastName: 'Kwan Choo',
    isAdmin: true,
    role: 'owner',
  };
  const ada = {
    workosUserId: 'user-ada',
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Tan',
    isAdmin: false,
    role: 'member',
  };
  const roster = [
    {
      schedule: {
        _id: 'schedule-ley',
        workosUserId: 'user-ley',
        enabled: true,
      },
      shifts: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        startMinutes: 540,
        endMinutes: 1020,
      })),
      timeOff: [],
    },
  ];

  mocks.useQuery
    .mockReturnValueOnce(roster)
    .mockReturnValueOnce([ley, ada])
    .mockReturnValueOnce(ley)
    .mockReturnValueOnce({ 'user-ley': 1, 'user-ada': 0 });

  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/availability']}>
      <Routes>
        <Route path="/dashboard/:agentId/availability" element={<SchedulePage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(markup).toContain('Mon - Fri, 9:00 AM - 5:00 PM');
  expect(markup).toContain('No available hours');
  expect(markup.indexOf('>Admin</span>')).toBeLessThan(
    markup.indexOf('>Ley Kwan Choo (You)</span>'),
  );
  expect(markup.match(/lucide-clock/g)).toHaveLength(2);
});
