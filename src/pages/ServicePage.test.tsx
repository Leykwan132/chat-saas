import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, test, vi } from 'vitest';
import ServicePage from './ServicePage';

vi.mock('react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');
  return { ...react, useEffect: (effect: () => void) => effect() };
});

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
  useQuery: (_query: unknown, args: Record<string, unknown>) => {
    if ('serviceId' in args) {
      return {
        collecting: 0,
        confirming: 0,
        booked: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
      };
    }
    if ('agentId' in args) {
      return {
        services: [
          {
            _id: 'service-1',
            name: 'Consultation',
            isActive: true,
            sortOrder: 0,
            durationMinutes: 30,
            fields: [],
            salesStyle: 'neutral',
            assignmentStrategy: 'balanced',
          },
        ],
      };
    }
    return [];
  },
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, isLoading: false }),
}));

vi.mock('@/components/ServiceForm', () => ({ ServiceForm: () => null }));
vi.mock('@/components/automation/DetailPageActionFooter', () => ({
  DetailPageActionFooter: () => null,
}));

test('Back to Services darkens without adding a hover background', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/services/service-1']}>
      <Routes>
        <Route path="/dashboard/:agentId/services/:serviceId" element={<ServicePage />} />
      </Routes>
    </MemoryRouter>,
  );
  const backLink = markup.match(/<a[^>]+href="\/dashboard\/agent-1\/services"[^>]*>/)?.[0];

  expect(backLink).toContain('hover:bg-transparent');
  expect(backLink).toContain('dark:hover:bg-transparent');
  expect(backLink).toContain('hover:text-foreground');
  expect(markup).toContain('>Active</span>');
  expect(markup).not.toContain('>Confirming</span>');
  expect(markup).not.toContain('>Booked</span>');
  expect(markup).not.toContain('>Completed</span>');
  expect(markup).not.toContain('>Cancelled</span>');
  expect(markup).not.toContain('>No-show</span>');
});
