import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { ServiceForm } from './ServiceForm';
import { DEFAULT_SERVICE_FORM } from '@/lib/serviceForm';

test('orders service configuration before the booking team section', () => {
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
  expect(markup).toContain('aria-pressed="true"');
  expect(markup).toContain('Service teammates');
  expect(markup).not.toContain('Service name');
});
