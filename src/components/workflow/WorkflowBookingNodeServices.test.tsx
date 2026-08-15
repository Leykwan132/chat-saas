import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test, vi } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import { WorkflowBookingNodeServices } from './WorkflowBookingNodeServices';

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
  useQuery: (_query: unknown, args: { agentId: string }) => args.agentId === 'empty-agent' ? [
    {
      _id: 'service-c',
      name: 'Inactive service',
      isActive: false,
      assignedTeammates: [],
    },
  ] : [
    {
      _id: 'service-a',
      name: 'Consultation',
      isActive: true,
      assignedTeammates: [{ workosUserId: 'user-a', name: 'Alex' }],
    },
    {
      _id: 'service-b',
      name: 'Follow-up',
      isActive: true,
      assignedTeammates: [{ workosUserId: 'user-b', name: 'Bailey' }],
    },
    {
      _id: 'service-c',
      name: 'Inactive service',
      isActive: false,
      assignedTeammates: [],
    },
  ],
}));

test('renders all active services with booking switches in inspector presentation', () => {
  const markup = renderToStaticMarkup(
    <WorkflowBookingNodeServices
      agentId={'agent' as Id<'agents'>}
      nodeId={'node' as Id<'workflowNodes'>}
      allowedServiceIds={['service-a' as Id<'appointmentServices'>]}
      disabled={false}
      presentation="inspector"
    />,
  );

  expect(markup).toContain('data-booking-service-presentation="inspector"');
  expect(markup).toContain('Consultation');
  expect(markup).toContain('Follow-up');
  expect(markup).toContain('aria-label="Remove Consultation for booking"');
  expect(markup).toContain('aria-label="Add Follow-up for booking"');
  expect(markup).not.toContain('Inactive service');
});

test('guides administrators to create a service when no active services exist', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <WorkflowBookingNodeServices
        agentId={'empty-agent' as Id<'agents'>}
        nodeId={'node' as Id<'workflowNodes'>}
        disabled={false}
        presentation="inspector"
      />
    </MemoryRouter>,
  );

  expect(markup).toContain('data-slot="empty"');
  expect(markup).toContain('No active services');
  expect(markup).toContain('Create a service before this workflow can book appointments.');
  expect(markup).toContain('href="/dashboard/empty-agent/services/new"');
  expect(markup).toContain('Create service');
});

test('keeps the empty-state create-service action interactive in node presentation', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <WorkflowBookingNodeServices
        agentId={'empty-agent' as Id<'agents'>}
        nodeId={'node' as Id<'workflowNodes'>}
        disabled={false}
      />
    </MemoryRouter>,
  );

  expect(markup).toContain('data-booking-service-presentation="node"');
  expect(markup).toContain('href="/dashboard/empty-agent/services/new"');
  expect(markup).toContain('nodrag nopan');
});
