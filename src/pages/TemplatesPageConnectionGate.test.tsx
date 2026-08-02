import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, test, vi } from 'vitest';
import TemplatesPage from './TemplatesPage';

vi.mock('convex/react', () => ({
  useQuery: () => [],
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ isLoading: false, role: 'owner' }),
}));

test('uses the compact Connect Channel prompt when WhatsApp is not connected', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/templates']}>
      <Routes>
        <Route path="/dashboard/:agentId/templates" element={<TemplatesPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(markup).toContain('Connect Channel');
  expect(markup).toContain('lucide-plus');
  expect(markup).not.toContain('Open Channels');
  expect(markup).not.toContain('border-[#25D366]/30');
});
