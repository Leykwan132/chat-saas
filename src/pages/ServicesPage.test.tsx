import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, test, vi } from 'vitest';
import ServicesPage from './ServicesPage';

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
  useQuery: () => ({
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
  }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, isLoading: false }),
}));

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
});
