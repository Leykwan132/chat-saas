import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { ServiceForm } from './ServiceForm';
import { DEFAULT_SERVICE_FORM } from '@/lib/serviceForm';

test('opens service details by default', () => {
  const markup = renderToStaticMarkup(
    <ServiceForm
      form={DEFAULT_SERVICE_FORM}
      setForm={vi.fn()}
      teamUserOptions={[
        { value: 'owner-id', name: 'Ley Kwan Choo', roleLabel: 'Owner' },
        { value: 'admin-id', name: 'Kwan Kwan', roleLabel: 'Admin' },
      ]}
      canManage
    />,
  );

  expect(markup.indexOf('Service details')).toBeLessThan(markup.indexOf('Appointment duration'));
  expect(markup.indexOf('Appointment duration')).toBeLessThan(markup.indexOf('Booking team'));
  expect(markup.indexOf('Booking team')).toBeLessThan(markup.indexOf('Booking form'));
  expect(markup).toContain('lucide-users-round size-4');
  expect(markup).toContain('lucide-briefcase-business size-4');
  expect(markup).toContain('lucide-calendar-clock size-4');
  expect(markup).toContain('lucide-clipboard-list size-4');
  const selectedNavigationItem = markup.match(/<button[^>]*aria-pressed="true"[^>]*>[\s\S]*?<\/button>/)?.[0];

  expect(selectedNavigationItem).toContain('Service details');
  expect(markup).toContain('>Name</span>');
  expect(markup).not.toContain('Service teammates');
  expect(markup).not.toContain('Service name');
});
