import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import ServicesPage from './ServicesPage';

const serviceCardsSource = readFileSync(
  fileURLToPath(new URL('../components/services/ServiceCards.tsx', import.meta.url)),
  'utf8',
);

let queryCall = 0;

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
  useQuery: () => {
    queryCall += 1;
    if (queryCall === 1) return {
      services: [
        {
          _id: 'service-active',
          name: 'Consultation',
          isActive: true,
          sortOrder: 0,
          durationMinutes: 30,
          fields: [],
          salesStyle: 'neutral',
          assignmentStrategy: 'balanced',
        },
        {
          _id: 'service-inactive',
          name: 'Installation',
          isActive: false,
          sortOrder: 1,
          durationMinutes: 60,
          fields: [],
          salesStyle: 'neutral',
          assignmentStrategy: 'balanced',
        },
      ],
      bookings: [],
    };
    if (queryCall === 2) return { workosUserId: 'user-ley' };
    if (queryCall === 3) return [];
    return { plan: 'starter' };
  },
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, isLoading: false }),
}));

vi.mock('@/components/upgradeModalContext', () => ({
  useUpgradeModal: () => ({ openUpgradeModal: vi.fn() }),
}));

beforeEach(() => {
  queryCall = 0;
});

test('service cards show status text aligned with their switches', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/services']}>
      <Routes>
        <Route path="/dashboard/:agentId/services" element={<ServicesPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(markup).toContain('>Active</span>');
  expect(markup).toContain('>Inactive</span>');
  expect(markup).toContain('aria-checked="true"');
  expect(markup).toContain('aria-label="Turn off Consultation"');
  expect(markup).toContain('aria-checked="false"');
  expect(markup).toContain('aria-label="Turn on Installation"');
  expect(serviceCardsSource).not.toContain('flex-1 truncate text-sm font-medium text-foreground');
});

test('services and appointments use line tabs instead of section headings', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/services']}>
      <Routes>
        <Route path="/dashboard/:agentId/services" element={<ServicesPage />} />
      </Routes>
    </MemoryRouter>,
  );
  const source = readFileSync(
    fileURLToPath(new URL('./ServicesPage.tsx', import.meta.url)),
    'utf8',
  );

  expect(markup).toContain('role="tablist"');
  expect(markup).toContain('Your Services');
  expect(markup).toContain('Booked Appointments');
  expect(markup).toMatch(/data-state="active"[^>]*>Your Services<\/button>/);
  expect(markup).toMatch(/data-state="inactive"[^>]*>Booked Appointments<\/button>/);
  expect(markup).not.toContain('<h2');
  expect(source).toContain('<Tabs defaultValue="services"');
  expect(source).toContain('<TabsList variant="line">');
  expect(source).toContain('<TabsContent value="services"');
  expect(source).toContain('<TabsContent value="appointments"');
  expect(serviceCardsSource).toContain('relative z-10 flex shrink-0 items-center gap-1.5');
  expect(source).toContain('CreateServiceDialog');
  expect(source).toContain('api.plans.getPlanAndUsage');
  expect(source).toContain('api.users.currentUser');
  expect(source).toContain("searchParams.get('create') === '1'");
});
