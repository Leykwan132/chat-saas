import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { ServiceAssignmentFields, ServiceDetailsFields } from './serviceFormShared';
import { DEFAULT_SERVICE_FORM } from '@/lib/serviceForm';

test('uses switches to select teammates and limits bulk selection to creation', () => {
  const props = {
    form: { ...DEFAULT_SERVICE_FORM, assignedWorkosUserIds: ['owner-id'] },
    setForm: vi.fn(),
    teamUserOptions: [
      { value: 'owner-id', name: 'Ley Kwan Choo', roleLabel: 'Owner' },
      { value: 'admin-id', name: 'Kwan Kwan', roleLabel: 'Admin' },
    ],
  };
  const editMarkup = renderToStaticMarkup(
    <ServiceAssignmentFields
      {...props}
    />,
  );
  const createMarkup = renderToStaticMarkup(<ServiceAssignmentFields {...props} showIncludeAll />);

  expect(editMarkup).toContain('Service teammates');
  expect(editMarkup).not.toContain('Include all teammates');
  expect(createMarkup).toContain('Include all teammates');
  expect(editMarkup).toContain('Bookings go to selected teammates who are available.');
  expect(editMarkup).toContain('Assignment method');
  expect(editMarkup).toContain('Included');
  expect(editMarkup).toContain('Not included');
  expect(editMarkup.match(/role="switch"/g)).toHaveLength(2);
  expect(editMarkup).not.toContain('size-4 rounded border-input');
});

test('offers remote and in-person meeting locations', () => {
  const markup = renderToStaticMarkup(
    <ServiceDetailsFields form={DEFAULT_SERVICE_FORM} setForm={vi.fn()} />,
  );

  expect(markup).toContain('Meeting location');
  expect(markup).toContain('Remote');
  expect(markup).toContain('In person');
  expect(markup).toContain('Address');
});
