import { useRef } from 'react';
import type { Doc } from '../../../convex/_generated/dataModel';
import { CalendarDatePickerField } from '@/components/calendar/CalendarDatePickerField';
import { EditBookingStatusField } from '@/components/calendar/EditBookingStatusField';
import { EditableTimeCombobox } from '@/components/EditableTimeCombobox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatOrgRoleLabel } from '../../../shared/teamRoleCatalog';
import type { AppointmentBookingDisplayStatus } from '@/lib/appointmentBookingStatusPresentation';
import {
  customerLabel,
  memberLabel,
  type CustomerOption,
  type EventFormState,
  type ServiceFieldDefinition,
} from './editBookingModel';

type TeamUser = Pick<Doc<'users'>, '_id' | 'firstName' | 'lastName' | 'email'> & { role?: string };

type Props = {
  state: EventFormState;
  update: (patch: Partial<EventFormState>) => void;
  updateCollectedField: (key: string, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  teamUsers: TeamUser[];
  customers: CustomerOption[];
  serviceFields: ServiceFieldDefinition[];
  appointment: boolean;
  appointmentLoading: boolean;
  disabled: boolean;
  autoFocusRemarks?: boolean;
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold text-muted-foreground">{children}</p>
);

export function EditBookingForm({
  state,
  update,
  updateCollectedField,
  onSubmit,
  teamUsers,
  customers,
  serviceFields,
  appointment,
  appointmentLoading,
  disabled,
  autoFocusRemarks,
}: Props) {
  const comboboxPortalContainerRef = useRef<HTMLDivElement>(null);

  return (
    <form id="edit-booking-form" onSubmit={onSubmit} className="relative grid grid-cols-1 gap-6 md:grid-cols-2">
      <div ref={comboboxPortalContainerRef} className="pointer-events-none absolute inset-0" />
      <div className="flex flex-col gap-6">
        <div className="space-y-4">
          <SectionTitle>Event Schedule</SectionTitle>
          <Field data-disabled={disabled || undefined}>
            <FieldLabel htmlFor="dialog-event-title">Title</FieldLabel>
            <Input id="dialog-event-title" value={state.title} onChange={(event) => update({ title: event.target.value })} placeholder="Event title" disabled={disabled} />
          </Field>
          <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
            <CalendarDatePickerField value={state.date} onChange={(date) => update({ date })} disabled={disabled} />
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
              <Label htmlFor="dialog-event-all-day">All day</Label>
              <Switch id="dialog-event-all-day" checked={state.allDay} onCheckedChange={(allDay) => update({ allDay })} disabled={disabled} />
            </div>
            {!state.allDay ? (
              <div className="grid grid-cols-2 gap-4">
                <EditableTimeCombobox
                  value={state.startTime}
                  onChange={(startTime) => update({ startTime })}
                  ariaLabel="Start time"
                  disabled={disabled}
                  portalContainer={comboboxPortalContainerRef}
                />
                <EditableTimeCombobox
                  value={state.endTime}
                  onChange={(endTime) => update({ endTime })}
                  ariaLabel="End time"
                  disabled={disabled}
                  portalContainer={comboboxPortalContainerRef}
                  contentAlign="end"
                />
              </div>
            ) : null}
          </div>
        </div>
        <div className="space-y-4">
          <SectionTitle>Assignment &amp; Details</SectionTitle>
          <Field data-disabled={disabled || undefined}>
            <FieldLabel>Team member</FieldLabel>
            <SearchableSelect
              value={state.assignedUserId || undefined}
              placeholder="Select team member"
              searchPlaceholder="Search team members..."
              emptyText="No team members found."
              options={teamUsers.map((user) => {
                const role = user.role ? formatOrgRoleLabel(user.role as Parameters<typeof formatOrgRoleLabel>[0]) : 'Member';
                return { value: user._id, label: memberLabel(user), tag: role, searchValue: `${memberLabel(user)} ${user.email} ${role}` };
              })}
              onChange={(assignedUserId) => update({ assignedUserId })}
              disabled={disabled}
            />
          </Field>
          <Field data-disabled={disabled || undefined}>
            <FieldLabel htmlFor="dialog-event-link">Link</FieldLabel>
            <Input id="dialog-event-link" type="url" value={state.link} onChange={(event) => update({ link: event.target.value })} placeholder="https://meet.google.com/..." disabled={disabled} />
          </Field>
          <Field data-disabled={disabled || undefined}>
            <FieldLabel htmlFor="dialog-event-description">Description</FieldLabel>
            <Textarea id="dialog-event-description" value={state.description} onChange={(event) => update({ description: event.target.value })} placeholder="Optional notes" className="min-h-32" disabled={disabled} />
          </Field>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="space-y-4">
          <SectionTitle>Customer Selection</SectionTitle>
          <Field data-disabled={disabled || undefined}>
            <FieldLabel>Customer</FieldLabel>
            <SearchableSelect
              value={state.customerId || undefined}
              placeholder="Select customer"
              searchPlaceholder="Search customers..."
              emptyText="No customers found."
              options={customers.map((customer) => ({ value: customer._id, label: customerLabel(customer), searchValue: `${customerLabel(customer)} ${customer.email ?? ''} ${customer.phone ?? ''}` }))}
              onChange={(customerId) => update({ customerId })}
              disabled={disabled}
            />
          </Field>
        </div>
        {appointment && !appointmentLoading ? (
          <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
            <SectionTitle>Customer detail</SectionTitle>
            <Field data-disabled={disabled || undefined}>
              <FieldLabel htmlFor="dialog-booking-customer-name">Customer name</FieldLabel>
              <Input id="dialog-booking-customer-name" value={state.collectedFields.name ?? ''} onChange={(event) => updateCollectedField('name', event.target.value)} placeholder="Customer name" disabled={disabled} />
            </Field>
            <Field data-disabled={disabled || undefined}>
              <FieldLabel htmlFor="dialog-booking-customer-phone">Phone</FieldLabel>
              <Input id="dialog-booking-customer-phone" value={state.collectedFields.phone ?? ''} onChange={(event) => updateCollectedField('phone', event.target.value)} placeholder="Phone number" disabled={disabled} />
            </Field>
            {serviceFields.map((field) => <ServiceField key={field.key} field={field} value={state.collectedFields[field.key] ?? ''} onChange={(value) => updateCollectedField(field.key, value)} disabled={disabled} />)}
          </div>
        ) : null}
        {appointment && !appointmentLoading && state.status ? (
          <EditBookingStatusField value={state.status} onValueChange={(status: AppointmentBookingDisplayStatus) => update({ status })} disabled={disabled} />
        ) : null}
        {appointment && !appointmentLoading ? (
          <div className="space-y-4">
            <SectionTitle>Internal Notes</SectionTitle>
            <Field data-disabled={disabled || undefined}>
              <FieldLabel htmlFor="dialog-event-remarks">Remarks</FieldLabel>
              <Textarea id="dialog-event-remarks" value={state.remarks} onChange={(event) => update({ remarks: event.target.value })} placeholder="Add internal notes for this booking" className="min-h-24" disabled={disabled} autoFocus={autoFocusRemarks} />
            </Field>
          </div>
        ) : null}
      </div>
    </form>
  );
}

function ServiceField({ field, value, onChange, disabled }: { field: ServiceFieldDefinition; value: string; onChange: (value: string) => void; disabled: boolean }) {
  const id = `dialog-booking-field-${field.key}`;
  if (field.type === 'boolean') {
    return <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5"><Label htmlFor={id}>{field.label}</Label><Switch id={id} checked={['yes', 'true'].includes(value.toLowerCase())} onCheckedChange={(checked) => onChange(checked ? 'Yes' : 'No')} disabled={disabled} /></div>;
  }
  if (field.type === 'select' && field.options?.length) {
    return <Field data-disabled={disabled || undefined}><FieldLabel>{field.label}</FieldLabel><SearchableSelect value={value || undefined} placeholder={`Select ${field.label.toLowerCase()}`} searchPlaceholder={`Search ${field.label.toLowerCase()}...`} emptyText="No options found." options={field.options.map((option) => ({ value: option, label: option, searchValue: option }))} onChange={onChange} disabled={disabled} /></Field>;
  }
  return <Field data-disabled={disabled || undefined}><FieldLabel htmlFor={id}>{field.label}</FieldLabel><Input id={id} type={field.type === 'number' ? 'number' : 'text'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.label} disabled={disabled} /></Field>;
}
