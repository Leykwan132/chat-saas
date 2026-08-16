import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, test, vi } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import { ScheduleAvailabilityEditor } from './ScheduleAvailabilityEditor';

const source = readFileSync(new URL('./ScheduleAvailabilityEditor.tsx', import.meta.url), 'utf8');

const mocks = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useMutation: mocks.useMutation,
  useQuery: mocks.useQuery,
}));

beforeEach(() => {
  mocks.useMutation.mockReset();
  mocks.useQuery.mockReset();
  mocks.useMutation.mockReturnValue(vi.fn());
});

test('renders fetched available hours without returning to the loading skeleton', () => {
  mocks.useQuery.mockReturnValue({
    user: {
      workosUserId: 'user-ley',
      email: 'ley@example.com',
      firstName: 'Ley',
      lastName: 'Kwan Choo',
      isAdmin: true,
      role: 'owner',
    },
    schedule: {
      _id: 'schedule-ley',
      _creationTime: 1,
      agentId: 'agent-1',
      workosUserId: 'user-ley',
      mode: 'scheduled',
      manualStatus: 'available',
      timezone: 'Asia/Kuala_Lumpur',
      enabled: true,
      createdAt: 1,
      updatedAt: 1,
    },
    shifts: [
      {
        _id: 'shift-monday',
        _creationTime: 1,
        userScheduleId: 'schedule-ley',
        dayOfWeek: 1,
        startMinutes: 540,
        endMinutes: 1020,
      },
    ],
    timeOff: [],
  });

  const markup = renderToStaticMarkup(
    <ScheduleAvailabilityEditor
      agentId={'agent-1' as Id<'agents'>}
      workosUserId="user-ley"
    />,
  );

  expect(markup).toContain('Monday');
  expect(markup).toContain('Unavailable');
  expect(markup).not.toContain('data-slot="skeleton"');
});

test('passes Save into the weekly availability container', () => {
  expect(source).toContain('footer={hasChanges ? (');
  expect(source).not.toContain('<div className="flex justify-end">');
});
