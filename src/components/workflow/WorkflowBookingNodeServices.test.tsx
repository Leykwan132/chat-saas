import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import { WorkflowBookingNodeServices } from './WorkflowBookingNodeServices';

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
  useQuery: () => [
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
