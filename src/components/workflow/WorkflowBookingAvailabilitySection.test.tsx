import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test, vi } from 'vitest';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { WorkflowBookingAvailabilityList } from './WorkflowBookingAvailabilitySection';
import type {
  WorkflowAvailabilityRosterEntry,
  WorkflowAvailabilityTeammate,
} from './workflowBookingAvailabilityModel';
import {
  runWorkflowAvailabilityToggle,
  setWorkflowAcceptingLeads,
} from './workflowBookingAvailabilityMutation';

const alex = {
  _id: 'user-row-alex',
  workosUserId: 'user-alex',
  email: 'alex@example.com',
  firstName: 'Alex',
  lastName: 'Tan',
  isAdmin: false,
  role: 'member',
} as unknown as WorkflowAvailabilityTeammate;

const jamie = {
  _id: 'user-row-jamie',
  workosUserId: 'user-jamie',
  email: 'jamie@example.com',
  firstName: 'Jamie',
  lastName: 'Lee',
  isAdmin: false,
  role: 'member',
} as unknown as WorkflowAvailabilityTeammate;

const alexSchedule = {
  schedule: {
    _id: 'schedule-alex',
    workosUserId: 'user-alex',
    timezone: 'Asia/Kuala_Lumpur',
    enabled: true,
  } as Doc<'userSchedules'>,
  shifts: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    startMinutes: 9 * 60,
    endMinutes: 17 * 60,
  })),
} satisfies WorkflowAvailabilityRosterEntry;

test('renders a compact scrollable weekly roster with detail links', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <WorkflowBookingAvailabilityList
        agentId={'agent-1' as Id<'agents'>}
        teammates={[alex, jamie]}
        roster={[alexSchedule]}
        pendingUserIds={new Set()}
        canManageAvailability
        onToggle={vi.fn()}
      />
    </MemoryRouter>,
  );

  expect(markup).toContain('Alex Tan');
  expect(markup).toContain('Jamie Lee');
  expect(markup).toContain('Mon–Fri · 9:00 AM–5:00 PM');
  expect(markup).toContain('(GMT+8) Kuala Lumpur');
  expect(markup).toContain('No hours set');
  expect(markup).toContain('Accepting leads');
  expect(markup).toContain('/dashboard/agent-1/availability/user-alex');
  expect(markup).toContain('max-h-64');
});

test('renders read-only availability guidance without interactive switches', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <WorkflowBookingAvailabilityList
        agentId={'agent-1' as Id<'agents'>}
        teammates={[alex]}
        roster={[alexSchedule]}
        pendingUserIds={new Set()}
        canManageAvailability={false}
        onToggle={vi.fn()}
      />
    </MemoryRouter>,
  );

  expect(markup).toContain('You need Lead Assignment management permission to change availability.');
  expect(markup).toContain('disabled=""');
});

test('initializes a missing schedule before enabling availability', async () => {
  const addUser = vi.fn().mockResolvedValue('schedule-jamie');
  const updateUser = vi.fn().mockResolvedValue(undefined);

  await setWorkflowAcceptingLeads({
    agentId: 'agent-1' as Id<'agents'>,
    teammate: jamie,
    rosterByUserId: new Map(),
    enabled: true,
    addUser,
    updateUser,
  });

  expect(addUser).toHaveBeenCalledWith({
    agentId: 'agent-1',
    workosUserId: 'user-jamie',
  });
  expect(updateUser).toHaveBeenCalledWith({
    userScheduleId: 'schedule-jamie',
    enabled: true,
  });
});

test('updates an existing schedule without recreating it', async () => {
  const addUser = vi.fn();
  const updateUser = vi.fn().mockResolvedValue(undefined);

  await setWorkflowAcceptingLeads({
    agentId: 'agent-1' as Id<'agents'>,
    teammate: alex,
    rosterByUserId: new Map([['user-alex', alexSchedule]]),
    enabled: false,
    addUser,
    updateUser,
  });

  expect(addUser).not.toHaveBeenCalled();
  expect(updateUser).toHaveBeenCalledWith({
    userScheduleId: 'schedule-alex',
    enabled: false,
  });
});

test('clears pending state and reports a failed immediate update', async () => {
  const pendingStates: boolean[] = [];
  const notify = {
    loading: vi.fn().mockReturnValue('toast-1'),
    success: vi.fn(),
    error: vi.fn(),
  };

  await runWorkflowAvailabilityToggle({
    agentId: 'agent-1' as Id<'agents'>,
    teammate: alex,
    rosterByUserId: new Map([['user-alex', alexSchedule]]),
    enabled: false,
    addUser: vi.fn(),
    updateUser: vi.fn().mockRejectedValue(new Error('Forbidden')),
    setPending: (pending) => pendingStates.push(pending),
    notify,
  });

  expect(pendingStates).toEqual([true, false]);
  expect(notify.success).not.toHaveBeenCalled();
  expect(notify.error).toHaveBeenCalledWith('Forbidden', 'toast-1');
});

test('keeps switch interaction separate from row navigation', () => {
  const sourcePath = fileURLToPath(
    new URL('./WorkflowBookingAvailabilitySection.tsx', import.meta.url),
  );
  const source = readFileSync(sourcePath, 'utf8');

  expect(source).toContain('event.stopPropagation()');
  expect(source).toContain('relative z-10 flex shrink-0 items-start gap-2');
  expect(source).toContain('Turn on availability for at least one teammate to use appointment booking.');
  expect(source).toContain('Availability is temporarily unavailable.');
});
